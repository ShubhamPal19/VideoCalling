let APP_ID = "6f4b2b34472c4fe3a3cada4e182e2bb6"

let queryString = window.location.search

let urlParams = new URLSearchParams(queryString)
let roomId = urlParams.get('room')

if(!roomId)
{
    window.location = "lobby.html"
}
let token = null
let uid = String(Math.floor(Math.random() * 10000))
console.log(uid)
let client;

let channel;

let localStream;
let remoteStream;
let peerConnection;

const servers = {
    iceServers : [
        {
            urls : ['stun:stun1.l.google.com:19302',
            'stun:stun2.l.google.com:19302']
        }
    ]
}

let constraints = {
    video:{
        width :{ min:640, ideal: 1920, max: 1920},
        height :{ min:480, ideal: 1080, max: 1080}
    },

    audio : true 

}


let init = async ()=>{

    client = await AgoraRTM.createInstance(APP_ID)
    await  client.login({uid, token})
    
    //index.html ? room = 234232
    channel = client.createChannel(roomId)
    await channel.join()
    
    
    client.on('MessageFromPeer',handleMessageFromPeer)
    channel.on('MemberJoined', handleUserJoined)
    channel.on('MemberLeft', handleUserLeft)
    localStream = await navigator.mediaDevices.getUserMedia(constraints)
    document.getElementById('user-1').srcObject = localStream
    
}

init()


let handleUserLeft = (MemberId) =>{
    
    document.getElementById('user-2').style.display = 'none'
    document.getElementById('user-1').classList.remove('smallFrame')
}
let handleMessageFromPeer = async(message, MemberId)=>{
    message = JSON.parse(message.text)
    
    if(message.type == 'offer'){
        createAnswer(MemberId, message.offer)
    }

    if(message.type == 'answer'){
        // console.log("Answer from peer is ", answer)
        addAnswer(message.answer)
    }

    if(message.type == 'candidate'){

        if(peerConnection){

            peerConnection.addIceCandidate(message.candidate)
        }
    }

}



let handleUserJoined = async (MemberId) =>{

    console.log('A new user joined the channel : ', MemberId)
    createOffer(MemberId)  
}

let createPeerConnection = async (MemberId)=>{
    peerConnection = new RTCPeerConnection(servers);
    
    remoteStream = new MediaStream();
    document.getElementById('user-2').srcObject = remoteStream
    document.getElementById('user-2').style.display = 'block'
    document.getElementById('user-1').classList.add('smallFrame')
    if(!localStream){
        localStream = await navigator.mediaDevices.getUserMedia({video:true, audio: true})
        console.log(localStream)
        document.getElementById('user-1').srcObject = localStream
         
    }
    localStream.getTracks().forEach(track =>{
        peerConnection.addTrack(track, localStream)
    })

    peerConnection.ontrack = (event) =>{
        event.streams[0].getTracks().forEach(track=>{
            remoteStream.addTrack(track)

        })
    }

    peerConnection.onicecandidate = async (event)=>{
        if(event.candidate){
            client.sendMessageToPeer({text: JSON.stringify({'type':'candidate', 'candidate': event.candidate})}, MemberId);
   
            console.log('New Ice Candidate: ', event.candidate)
        }
    }

}

let createOffer = async (MemberId)=>{
    
   await createPeerConnection(MemberId)
   
   let offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer)

    
    client.sendMessageToPeer({text: JSON.stringify({'type':'offer', 'offer': offer})}, MemberId);
   
}


let createAnswer = async (MemberId,offer) =>{

    await createPeerConnection(MemberId)

    await peerConnection.setRemoteDescription(offer)

    let answer = await  peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    client.sendMessageToPeer({text: JSON.stringify({'type': 'answer', 'answer': answer})}, MemberId);
      
}



let addAnswer = async(answer)=>{
    console.log("answer is -----------------------" ,answer);
    if(!peerConnection.currentRemoteDescription){  
        peerConnection.setRemoteDescription(answer)
    }
}


let leaveChannel = async()=>{

    await channel.leave();
    await client.logout();
}


let toggleCamera = async()=>{
    let videoTrack = localStream.getTracks().find(track => track.kind=== 'video')
    if(videoTrack.enabled){
        videoTrack.enabled = false;
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(255,80,80)'
        
    }else{
        videoTrack.enabled = true;
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(179,102,249,.9)'
    }
}
let toggleAudio = async()=>{
    let audioTrack = localStream.getTracks().find(track => track.kind=== 'audio')
    if(audioTrack.enabled){
        audioTrack.enabled = false;
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(255,80,80)'
        
    }else{
        audioTrack.enabled = true;
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(179,102,249,.9)'
    }
}
window.addEventListener('beforeunload', leaveChannel);

document.getElementById('mic-btn').addEventListener('click', toggleAudio)
document.getElementById('camera-btn').addEventListener('click', toggleCamera)