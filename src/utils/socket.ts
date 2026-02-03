import {Socket, Server as SocketServer} from "socket.io";

import { Server as HttpServer } from "http";
import { verifyToken } from "@clerk/express";

import { Message } from "../models/Message";
import { Chat } from "../models/Chat";
import { User } from "../models/User";

interface SocketWithUserId extends Socket{
    userId ?: string;
}

// store online users in memory: userId => socketId
export const onlineUsers: Map<string,string> = new Map();

export const initializeSocket = (httpServer: HttpServer)=>{

    const allowedOrigins = [
        "http://localhost:5173",
        "http://localhost:8081",
        process.env.FRONTEND_URL as string
    ]
    const io = new SocketServer(httpServer, {cors: {origin: allowedOrigins}})

    // token verification middleware
    io.use(async(socket,next)=>{
        const token = socket.handshake.auth.token;
        if(!token) return next(new Error("Authentication error: No token provided"));

        try{
            const session = await verifyToken(token,{secretKey: process.env.CLERK_SECRET_KEY as string});
            const clerkId = session.sub

            const user = await User.findOne({clerkId});
            if(!user) return next(new Error("Authentication error: User not found"));

            (socket as SocketWithUserId).userId = user._id.toString()

        }
        catch(error: any){
            return next(new Error(error));
        }
    })

    // when new user connect to server
    io.on("connection",(socket: SocketWithUserId)=>{
        const userId = socket.userId

        if(!userId) return;

        // send list of currently online users to the newly connected user
        socket.emit("online-users",{userIds: Array.from(onlineUsers.keys())});

        // store user in onlin users map
        onlineUsers.set(userId , socket.id);

        //notify others that this user is online
        socket.broadcast.emit("user-online", {userId});

        socket.join(`user-${userId}`);

        socket.on("join-chat", (chatId: string)=>{
            socket.join(`chat:${chatId}`);
        })

        socket.on("leave-chat",(chatId: string)=>{
            socket.leave(`chat:${chatId}`);
        })

        socket.on("send-message",async (data: {chatId: string; text: string})=>{
            try{
                const {chatId,text} = data;

                const chat = await Chat.findOne(
                    {
                        _id: chatId,
                        participants: userId
                    }
                )

                if(!chat){
                    socket.emit("error", {message: "Chat not found or access denied"});
                    return;
                }

                const message = await Message.create({
                    chat: chatId,
                    sender: userId,
                    text,
                })

                chat.lastMessage = message._id;
                chat.lastMessageAt = new Date();
                await chat.save();

                await message.populate("sender","name email avatar")

                // emit to chat room (for usrs in chat room)
                io.to(`chat:${chatId}`).emit("new-message",message);

                for(const participantId of chat.participants){
                    io.to(`user:${participantId}`).emit("new-message",message);
                }

            }
            catch(error){
                socket.emit("socket-error", {message: "Failed to send message"});
            }
        })

        socket.on("typing",async(data)=>{})

        socket.on("diconnect",()=>{
            onlineUsers.delete(userId);

            // notify others that this user is offline
            socket.broadcast.emit("user-offline",{userId});
        })
    })

    return io;
    
}