
// 定义一个 Chat 类
var Chat = function(socket) {
    this.socket = socket;
};

// 发送消息
Chat.prototype.sendMessage = function(room, text) {
    var message = { 
        room: room,
        text: text      
    };
    this.socket.emit("message", message);
};

// 更改房间
Chat.prototype.changeRoom = function(room) {
    this.socket.emit("join", {
        newRoom: room
    });
};

// 处理聊天命令
Chat.prototype.processCommand = function(command) {
    var words = command.split(" ");
    // 从第一个单词开始解析命令
    var command = words[0].substring(1, words[0].length).toLowerCase();

    var message = false;

    console.log("command:" + command);

    switch (command) {
        case "join":
            words.shift();
            var room = words.join(" ");
            // 处理房间的变更
            this.changeRoom(room);
            break;
        case "nick":
            words.shift();
            var name = words.join(" ");
            // 更换昵称
            this.socket.emit("nameAttempt", name);
        default:
            // 无法识别的命令，则返回错误
            message = "Unrecognized command";
            break;
    }
    return message;
};
