import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
    faAngleLeft,
    faEllipsis,
    faPencil,
    faPeopleGroup,
    faArrowRightFromBracket,
    faTrashCan,
    faCirclePlus,
    faMagnifyingGlass
} from '@fortawesome/free-solid-svg-icons'
import {
    faImage
} from '@fortawesome/free-regular-svg-icons'
import clsx from "clsx"
import { getDatabase, onValue, ref, update, set } from "firebase/database"
import { getAuth } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { getStorage, uploadBytes, getDownloadURL, ref as storageRef } from "firebase/storage"
import { v4 as uuidv4 } from "uuid"

import style from './Controls.module.css'
import { useRoomInformation } from "../../../../../../hooks/useRoomInformation"
import { RoomAvatar } from "../../../../../../components/Avatar"
import OnlineStatus from "../../../../../../components/OnlineStatus"
import { useFriendStatus } from "../../../../../../hooks/useFriendStatus"
import { useLastTimeOnline } from "../../../../../../hooks/useLastTimeOnline"
import { getTimeLine } from "../../../../../../utils/timeConversion"
import { useHideClickOutside } from "../../../../../../hooks/useHideClickOutside"
import Modal_Box from "../../../../../../components/Modal_Box"
import {
    useDisplay as useDisplaySecondScreen,
    useHide as useHideSecondScreen
} from "../../../../../../components/SecondScreen/hookControls"
import { LightBtn, PrimaryBtn } from "../../../../../../components/Button"
import { InputWithValidation } from "../../../../../../components/Input"
import { useAdd as useAddToast } from "../../../../../../components/Toasts/hookControls"
import {
    useStart as useStartProgressBar,
    useEnd as useEndProgressBar
} from "../../../../../../components/ProgressBar/hookControls"
import FilteredField from "../../../../../../components/FilteredField"
import CirlceCheckbox from "../../../../../../components/Input/CircleCheckbox"

const RoomOption = React.memo(function RoomOption({ title, className, icon, ...restProps }) {
    return (
        <li
            className={clsx(style.roomOption, className)}
            {...restProps}
        >
            <div className={style.optionIco}>
                <FontAwesomeIcon icon={icon} />
            </div>
            <p className={style.optionTitle}>{title}</p>
        </li>
    )
})

const RoomOptions = React.memo(function RoomOptions({ children }) {
    return (
        <ul className={style.roomOptions}>
            {children}
        </ul>
    )
})

const RoomRemove = React.memo(function RoomRemove({ conversationRef, classActive, roomDescription }) {
    const database = getDatabase()
    const { roomID, carrier, isGroup } = roomDescription
    const auth = getAuth()
    const user = auth.currentUser
    const hideSecondScreen = useHideSecondScreen()
    const navigate = useNavigate()
    const [dataUpdate, setDataUpdate] = useState({})

    useEffect(() => {
        if (!isGroup) return

        const memsRef = ref(database, 'rooms/' + roomID + '/information/members')
        const unsub = onValue(memsRef, (snapshot) => {
            if (!snapshot.val()) return

            const mems = Object.values(snapshot.val())
            const newDataUpdate = {}
            newDataUpdate['rooms/' + roomID] = null

            mems.forEach(memID => {
                newDataUpdate['users/' + memID + '/groups/' + roomID] = null
                newDataUpdate['users/' + memID + '/chats/' + roomID] = null
            })

            setDataUpdate(newDataUpdate)
        })

        return () => unsub()
    }, [])

    useEffect(() => {
        if (isGroup) return

        setDataUpdate({
            ['users/' + user.uid + '/chats/' + carrier.fUID]: null,
            ['users/' + carrier.fUID + '/chats/' + user.uid]: null,
            ['rooms/' + roomID]: null
        })
    }, [])

    const handleRemoveRoom = useCallback(() => {
        update(ref(database), dataUpdate)
            .then(hideSecondScreen)
            .then(() => {
                return new Promise(resolve => {
                    conversationRef.current.classList.remove(classActive)
                    setTimeout(resolve, 300)
                })
            })
            .then(() => navigate('/room'))
    }, [dataUpdate])

    return (
        <Modal_Box title="X??a cu???c tr?? chuy???n n??y?">
            <p className={style.noteRemove}>T???t c??? th??ng tin v??? cu???c tr?? chuy???n n??y s??? b??? x??a v??nh vi???n.</p>
            <div className={style.removeRoomControls}>
                <LightBtn title='H???y' onClick={hideSecondScreen} />
                <PrimaryBtn title='X??a tin nh???n' onClick={handleRemoveRoom} />
            </div>
        </Modal_Box>
    )
})

const PrivateRoomOption = React.memo(function PrivateRoomOption({ conversationRef, classActive, roomDescription }) {
    const displaySecondScreen = useDisplaySecondScreen()

    const handleRemoveConversation = useCallback(() => {
        displaySecondScreen(() => (
            <RoomRemove
                conversationRef={conversationRef}
                classActive={classActive}
                roomDescription={roomDescription}
            />
        ))
    }, [])

    return (
        <RoomOptions>
            <RoomOption
                className={style.rmRoom}
                onClick={handleRemoveConversation}
                title='X??a cu???c tr?? chuy???n'
                icon={faTrashCan}
            ></RoomOption>
        </RoomOptions>
    )
})

const GroupNameEditing = React.memo(function GroupNameEditing({ roomDescription }) {
    const database = getDatabase()
    const { roomID } = roomDescription
    const [info, setInfo] = useState({ groupName: '' })
    const [isValid, setIsValid] = useState({ groupName: false })
    const [placeholder, setPlaceholder] = useState('')

    useEffect(() => {
        const groupNameRef = ref(database, 'rooms/' + roomID + '/information/name')
        const unsub = onValue(groupNameRef, (snapshot) => {
            setPlaceholder(snapshot.val())
        })

        return () => unsub()
    }, [])

    const hideSecondScreen = useHideSecondScreen()
    const handleCancel = useCallback(() => {
        hideSecondScreen()
    }, [])

    const handleNameUpdate = useCallback(() => {
        if (!isValid.groupName) return

        update(ref(database), {
            ['rooms/' + roomID + '/information/name']: info.groupName
        })
            .then(hideSecondScreen)
    }, [isValid, info])

    return (
        <Modal_Box title='?????t t??n nh??m chat'>
            <InputWithValidation
                className={style.groupNameInput}
                icon={faPencil}
                data={info}
                setData={setInfo}
                dataType='groupName'
                setValidData={setIsValid}
                placeholder={placeholder}
                rules={{
                    length: {
                        rule: { min: 2, max: 98 },
                        errMessage: `T??n ng?????i d??ng ph???i t??? 2 - 98 k?? t???.`
                    },
                    startOrEndWithSpace: {
                        errMessage: 'T??n ng?????i d??ng kh??ng ???????c xu???t hi???n k?? t??? kho???ng tr???ng ??? ?????u ho???c cu???i.'
                    }
                }}
            />
            <div className={style.controls}>
                <PrimaryBtn title='L??u' className={style.btn} onClick={handleNameUpdate} />
                <LightBtn title='H???y' className={style.btn} onClick={handleCancel} />
            </div>
        </Modal_Box>
    )
})

const AvatarUpdate = React.memo(function AvatarUpdate({ photo, roomDescription }) {
    const { roomID } = roomDescription
    const storage = getStorage()
    const previewURL = URL.createObjectURL(photo)
    const addToast = useAddToast()
    const startProgressBar = useStartProgressBar()
    const endProgressBar = useEndProgressBar()
    const hideSecondScreen = useHideSecondScreen()
    const database = getDatabase()

    const handleUpdateAvatar = useCallback(() => {
        const avtStorageRef = storageRef(storage, 'avatars/' + roomID)

        startProgressBar()

        uploadBytes(avtStorageRef, photo)
            .then(({ ref }) => getDownloadURL(ref))
            .then((url) => {
                set(ref(database, 'rooms/' + roomID + '/information/photoURL'), url)
            })
            .then(() => addToast({
                id: uuidv4(),
                title: 'Tuy???t v???i!',
                des: 'Thay ?????i ???nh th??nh c??ng.',
                type: 'success',
                time: 5000
            }))
            .then(handleCancel)
            .catch(() => addToast({
                id: uuidv4(),
                title: 'Kh??ng th??nh c??ng!',
                des: '???? x???y ra l???i! Vui l??ng th??? l???i.',
                type: 'error', time: 5000
            }))
            .finally(endProgressBar)
    }, [])

    const handleCancel = useCallback(() => {
        hideSecondScreen()
    }, [])

    return (
        <Modal_Box title='Thay ?????i ???nh'>
            <div className={style.photo}>
                <img src={previewURL} />
            </div>
            <div className={style.controls}>
                <PrimaryBtn title='L??u' className={style.btn} onClick={handleUpdateAvatar} />
                <LightBtn title='H???y' className={style.btn} onClick={handleCancel} />
            </div>
        </Modal_Box>
    )
})

const AddMember = React.memo(function AddMember({ roomDescription }) {
    const database = getDatabase()
    const [allMem, setAllMem] = useState([])
    const [memGrID, setMemGrID] = useState([])
    const [memNotInGr, setMemNotInGr] = useState([])
    const [memRemaning, setMemRemaing] = useState([])
    const [memSelected, setMemSelected] = useState([])
    const [keySearching, setKeySearching] = useState('')
    const { roomID } = roomDescription
    const hideSecondScreen = useHideSecondScreen()
    const auth = getAuth()
    const user = auth.currentUser

    useEffect(() => {
        const allMemRef = ref(database, 'users')
        const unsub = onValue(allMemRef, (snapshot) => {
            const response = snapshot.val() ?? {}
            for (let uid in response) {
                response[uid].uid = uid
            }
            setAllMem(Object.values(response))
        })

        return () => unsub()
    }, [roomID])

    useEffect(() => {
        const memGrIdRef = ref(database, 'rooms/' + roomID + '/information/members')
        const unsub = onValue(memGrIdRef, (snapshot) => {
            const response = snapshot.val()
            return (response ? setMemGrID(Object.values(response)) : setMemGrID([]))
        })

        return () => unsub()
    }, [roomID])

    useEffect(() => {
        if (allMem.length < 1) return

        const memberNotInGr = allMem.filter(mem => {
            return !memGrID.some(id => mem.uid === id)
        })

        setMemNotInGr(memberNotInGr)
    }, [allMem, memGrID])

    const handleInputChange = useCallback((event) => {
        setKeySearching(event.target.value)
    }, [])

    const filterByEmail = useCallback((userData) => {
        return userData.filter(user => user.information.email === keySearching)
    }, [keySearching])

    const filterByAccount = useCallback((userData) => {
        if (!keySearching.trim()) return []
        const reg = new RegExp(keySearching, 'i')
        return userData.filter(user => reg.test(user.information.name))
    }, [keySearching])

    const filterByUID = useCallback((userData) => {
        return userData.filter(user => user.information.uid === keySearching)
    }, [keySearching])

    useEffect(() => {
        const memRemaning = [
            ...filterByEmail(memNotInGr),
            ...filterByAccount(memNotInGr),
            ...filterByUID(memNotInGr)
        ]

        setMemRemaing(memRemaning)
    }, [keySearching])

    const selectMem = useCallback((uid) => {
        if (memSelected.includes(uid)) {
            setMemSelected(memSelected.filter(uidSelected => uidSelected != uid))
        } else {
            setMemSelected([
                ...memSelected,
                uid
            ])
        }
    }, [memSelected])

    const handleAddMem = useCallback(() => {
        const updates = {}
        memSelected.forEach(memUID => {
            updates['users/' + memUID + '/groups/' + roomID] = roomID
            updates['rooms/' + roomID + '/information/members/' + memUID] = memUID
            updates['users/' + memUID + '/chats/' + roomID] = {
                isGroup: true,
                roomID: roomID,
                lastMessage: {
                    message: 'B???n ???? ???????c th??m v??o nh??m m???i.',
                    sendBy: user.uid,
                    timestamp: Date.now()
                }
            }
        })

        update(ref(database), updates)
            .then(hideSecondScreen)
    }, [memSelected])

    return (
        <Modal_Box title='Th??m th??nh vi??n'>
            <div className={style.memSearhInput}>
                <FontAwesomeIcon icon={faMagnifyingGlass} className={style.memSearchIco} />
                <input type='text' value={keySearching} onChange={handleInputChange} />
            </div>
            <div className={style.memResult}>
                {
                    memRemaning.map(mem => (
                        <div className={style.memOption} key={mem.uid} onClick={() => selectMem(mem.uid)}>
                            <FilteredField uid={mem.uid} />
                            <CirlceCheckbox checked={memSelected.includes(mem.uid)} />
                        </div>
                    ))
                }
            </div>
            <div className={style.addMemBtn}>
                <PrimaryBtn
                    title='Th??m ng?????i'
                    className={clsx(
                        Boolean(memSelected.length > 0) ?
                            style.addMemBtnAccept :
                            style.addMemBtnDark
                    )}
                    onClick={
                        Boolean(memSelected.length > 0) ?
                            handleAddMem :
                            () => { }
                    }
                />
            </div>
        </Modal_Box>
    )
})

const AllMember = React.memo(function AllMember({ conversationRef, classActive, roomDescription }) {
    const [member, setMember] = useState([])
    const database = getDatabase()
    const { roomID } = roomDescription
    const auth = getAuth()
    const user = auth.currentUser
    const navigate = useNavigate()
    const displaySecondScreen = useDisplaySecondScreen()
    const hideSecondScreen = useHideSecondScreen()

    useEffect(() => {
        const memRef = ref(database, 'rooms/' + roomID + '/information/members')
        const unsub = onValue(memRef, (snapshot) => {
            const response = snapshot.val()
            return (response ? setMember(Object.values(response)) : setMember([]))
        })

        return () => unsub()
    }, [])

    const memberClick = useCallback((uid) => {
        if (uid === user.uid) return

        conversationRef.current.classList.remove(classActive)
        hideSecondScreen()

        new Promise(resolve => {
            setTimeout(() => {
                navigate('/room')
                resolve()
            }, 300)
        })
            .then(() => {
                setTimeout(() => navigate('/room/' + uid), 100)
            })
    }, [])

    const handleAddMem = useCallback(() => {
        displaySecondScreen(() => <AddMember roomDescription={roomDescription} />)
    }, [roomDescription])

    return (
        <Modal_Box title='Th??nh vi??n nh??m'>
            <div className={style.memsList}>
                {
                    member.map(memID => <FilteredField uid={memID} key={memID} onClick={() => memberClick(memID)} />)
                }
            </div>
            <div className={style.addMem} onClick={handleAddMem}>
                <FontAwesomeIcon icon={faCirclePlus} className={style.addMemIco} />
                <p className={style.addMemTitle}>Th??m th??nh vi??n</p>
            </div>
        </Modal_Box>
    )
})

const RoomExit = React.memo(function RoomExit({ conversationRef, classActive, roomDescription }) {
    const { roomID } = roomDescription
    const auth = getAuth()
    const user = auth.currentUser
    const database = getDatabase()
    const hideSecondScreen = useHideSecondScreen()
    const navigate = useNavigate()

    const handleExit = useCallback(() => {
        conversationRef.current.classList.remove(classActive)
        hideSecondScreen()
        setTimeout(() => {
            navigate('/room')
            update(ref(database), {
                ['users/' + user.uid + '/groups/' + roomID]: null,
                ['users/' + user.uid + '/chats/' + roomID]: null,
                ['rooms/' + roomID + '/information/members/' + user.uid]: null,
            })
        }, 300)
    }, [user.uid, roomID])

    return (
        <Modal_Box title="Tho??t kh???i nh??m?">
            <p className={style.noteRemove}>B???n ch???c ch???n r???ng m??nh mu???n r???i kh???i nh??m?</p>
            <div className={style.removeRoomControls}>
                <LightBtn title='H???y' onClick={hideSecondScreen} />
                <PrimaryBtn title='Tho??t nh??m' onClick={handleExit} />
            </div>
        </Modal_Box>
    )
})

const GroupRoomOption = React.memo(function GroupRoomOption({ permission, conversationRef, classActive, roomDescription }) {
    const displaySecondScreen = useDisplaySecondScreen()
    const addToast = useAddToast()

    const handleEditGroupName = useCallback(() => {
        displaySecondScreen(() => <GroupNameEditing roomDescription={roomDescription} />)
    }, [roomDescription])

    const handleFileChange = useCallback((event) => {
        const files = event.target.files
        const file = files[0]

        if (!/^image\//i.test(file.type)) {
            addToast({
                id: uuidv4(),
                title: 'File kh??ng h???p l???!',
                des: 'H??y ch???n ???nh c?? ?????nh d???ng jpeg ho???c png.',
                type: 'error',
                time: 5000
            })
        } else {
            displaySecondScreen(() => <AvatarUpdate photo={file} roomDescription={roomDescription} />)
        }
        event.target.value = ''
    }, [roomDescription])

    const fileInput = useMemo(() => {
        const fileInput = document.createElement('input')
        fileInput.setAttribute('type', 'file')
        fileInput.setAttribute('accept', 'image/jpeg, image/png')
        fileInput.addEventListener('change', handleFileChange)
        return fileInput
    }, [])

    const handleUpdatePhotoURL = useCallback(() => {
        fileInput.click()
    }, [])

    const handleAllMember = useCallback(() => {
        displaySecondScreen(() => <AllMember
            conversationRef={conversationRef}
            classActive={classActive}
            roomDescription={roomDescription}
        />)
    }, [roomDescription])

    const handleExitGroup = useCallback(() => {
        displaySecondScreen(() => <RoomExit
            conversationRef={conversationRef}
            classActive={classActive}
            roomDescription={roomDescription}
        />)
    }, [roomDescription])

    return (
        <RoomOptions>
            <RoomOption icon={faPencil} title='Ch???nh s???a t??n' onClick={handleEditGroupName} />
            <RoomOption icon={faImage} title='Thay ?????i ???nh' onClick={handleUpdatePhotoURL} />
            <RoomOption icon={faPeopleGroup} title='Th??nh vi??n nh??m' onClick={handleAllMember} />
            <RoomOption
                icon={faArrowRightFromBracket}
                className={style.rmRoom}
                title='R???i kh???i nh??m'
                onClick={handleExitGroup}
            />
        </RoomOptions>
    )
})

const Controls = React.memo(function Controls({ handleBackToRoom, conversationRef, classActive, roomDescription }) {
    const { roomID, isGroup, carrier } = roomDescription
    const roomInfo = useRoomInformation({ roomID, isGroup, fUID: carrier?.fUID })
    const isOnline = useFriendStatus(carrier?.fUID)
    const { lastTimeOnline } = useLastTimeOnline(carrier?.fUID)
    const [displayRoomOption, setDisplayRoomOption] = useState(false)
    const moreBtnRef = useRef()
    const auth = getAuth()
    const user = auth.currentUser
    const [numUnseen, setNumUnseen] = useState(null)
    const database = getDatabase()

    const handleToggleRoomOption = useCallback(() => {
        setDisplayRoomOption(prev => !prev)
    }, [])

    const handleHideRoomOption = useCallback(() => {
        setDisplayRoomOption(false)
    })

    useHideClickOutside(moreBtnRef, handleHideRoomOption)

    useEffect(() => {
        const unseenRef = ref(database, 'users/' + user.uid + '/unseenMessages')
        const unsub = onValue(unseenRef, (snapshot) => {
            const response = snapshot.val()
            response ? setNumUnseen(Object.keys(response).length) : setNumUnseen(null)
        })

        return () => unsub()
    }, [])

    return (
        <div className={style.control}>
            <div className={style.left}>
                <button className={style.back} onClick={handleBackToRoom}>
                    <FontAwesomeIcon icon={faAngleLeft} className={style.leftArrow} />
                    {
                        numUnseen &&
                        <span className={style.num}>{numUnseen}</span>
                    }
                </button>
                <div className={style.fUser}>
                    <div className={style.avatar}>
                        <RoomAvatar
                            isGroup={isGroup}
                            photoURL={roomInfo.photoURL}
                            name={roomInfo.name}
                            membersInfo={roomInfo.membersInfo}
                        />
                        {
                            isGroup ||
                            <div className={style.userStt}>
                                <OnlineStatus userID={carrier.fUID} showOfflineStt={false} />
                            </div>
                        }
                    </div>
                    <div className={style.des}>
                        <h3 className={style.name}>{roomInfo.name}</h3>
                        {isGroup ||
                            <p className={style.time}>
                                {
                                    isOnline ? '??ang ho???t ?????ng' :
                                        (
                                            /offline/i.test(getTimeLine(lastTimeOnline, 'offline')) ?
                                                'B??? ??i b???n! H??? c?? ng?????i kh??c r???i' :
                                                `Ho???t ?????ng ${getTimeLine(lastTimeOnline)} tr?????c`
                                        )
                                }
                            </p>}
                    </div>
                </div>
            </div>
            <div className={style.right}>
                <button
                    className={style.more}
                    onClick={handleToggleRoomOption}
                    ref={moreBtnRef}
                >
                    <FontAwesomeIcon icon={faEllipsis} />
                </button>
                {
                    displayRoomOption &&
                    (
                        isGroup ?
                            <GroupRoomOption
                                conversationRef={conversationRef}
                                classActive={classActive}
                                permission={user.uid === roomInfo.createdBy}
                                roomDescription={roomDescription}
                            /> :
                            <PrivateRoomOption
                                conversationRef={conversationRef}
                                classActive={classActive}
                                roomDescription={roomDescription}
                            />
                    )
                }
            </div>
        </div>
    )
})

export default Controls