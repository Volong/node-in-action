
var socketio = require("socket.io");

var io;

var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function(server) {
	// 启动 socket.io 服务器
	io = socketio.listen(server);
	io.set("log level", 1);
	// 定义每个用户连接的处理逻辑
	io.sockets.on("connection", function(socket) {
		// 在用户连接时，赋予一个用户名
		guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
		// 在用户连接时，将他放入聊天室 Lobby 中
		joinRoom(socket, "Lobby");
		// 处理用户的相关信息
		handleMessageBroadcasting(socket, nickNames);
		handleNameChangeAttempts(socket, nickNames, namesUsed);
		handleRoomJoining(socket);
		// 当用户发出请求时，向其提供已经被占用的聊天室列表
		socket.on("rooms", function() {
			socket.emit("rooms", io.sockets.manager.rooms);
		});
		// 定义用户断开连接后的清除逻辑
		handleClientDisconnection(socket, nickNames, namesUsed);
	});
}

// 分配用户昵称
function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
	// 生成新昵称
	var name = "Guest" + guestNumber;
	// 把用户昵称跟客户端连接id关联上
	nickNames[socket.io] = name;
	// 让用户知道他们的昵称
	socket.emit("nameResult", {
		success: true,
		name: name
	});
	// 存放已经被占用的昵称
	namesUsed.push(name);
	// 增加用来生成昵称的计数器
	return guestNumber + 1;
}

// 进入聊天室
function joinRoom(socket, room) {
	// 用户进入房间
	socket.join(room);
	// 记录用户的当前房间
	currentRoom[socket.id] = room;
	// 让用户知道他们进入了新的房间
	socket.emit("joinResult", {
		room: room
	});
	// 让房间里面的其它用户知道有新用户进入了房间
	socket.broadcast.to(room).emit("message", {
		text: nickNames[socket.id] + " has joined " + room + "."
	});

	// 确定有哪些用户在这个房间里
	var usersInRoom = io.sockets.clients(room);
	// 如果不止一个用户在这个房间里，看一下都是谁
	if (usersInRoom.length > 1) {
		var usersInRoomSummary = "Users currently in " + room + ": ";
		for (var index in usersInRoom) {
			var userSocketId = usersInRoom[index].id;
			if (userSocketId != socket.id) {
				if (index > 0) {
					usersInRoomSummary += ", ";
				}
				usersInRoomSummary += nickNames[userSocketId];
			}
		}
		usersInRoomSummary += ".";
		socket.emit("message", {
			text: usersInRoomSummary
		});
	}
}

// 更改用户名
function handleNameChangeAttempts(socket, nickNames, namesUsed) {
	// 添加 nameAttempt 事件的监听器
	socket.on("nameAttempt", function(name) {
		// 昵称不能以Guest开头
		if (name.indexOf("Guest") == 0) {
			socket.emit("nameResult", {
				success: false,
				message: "Names cannot begin with 'Guest'. "
			});
		} else {
			// 如果昵称还没有注册则注册
			if (namesUsed.indexOf(name) == -1) {
				var previousName = nickNames[socket.id];
				var previousNameIndex = namesUsed.indexOf(previousName);
				namesUsed.push(name);
				nickNames[socket.id] = name;
				// 删掉之前用的昵称，让其他用户可以使用
				delete namesUsed[previousNameIndex];
				socket.emit("nameResult", {
					success: true,
					name: name
				});

				socket.broadcast.to(currentRoom[socket.id]).emit("message", {
					text: previousName + " is now known as " + name + "."
				});
			}
		}
	});
}

// 发送聊天消息
function handleMessageBroadcasting(socket) {
	socket.on("message", function(message) {
		socket.broadcast.to(message.room).emit("message", {
			text: nickNames[socket.id] + ":" + message.text
		});
	});
}


// 创建房间
function handleRoomJoining(socket) {
	socket.on("join", function(room) {
		socket.leave(currentRoom[socket.id]);
		joinRoom(socket, room.newRoom);
	});
}


// 用户断开连接
function handleClientDisconnection(socket) {
	socket.on("disconnection", function() {
		var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
		delete namesUsed[nameIndex];
		delete nickNames[socket.id];
	});
}