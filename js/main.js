//JavaScript code for general stuff (feel free to create extra files)
const socket = new WebSocket("ws://172.28.142.145:8888/frames");
socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleData(data);
}