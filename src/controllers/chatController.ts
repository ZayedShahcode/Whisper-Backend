import { NextFunction, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { Chat } from "../models/Chat";
import { lstat } from "node:fs";

export async function getChats(req:AuthRequest,res:Response,next:NextFunction){
    try{
        const userId = req.userId;

        const chats = await Chat.find({participants: userId})
        .populate("participants","name email avatar")
        .populate("lastMessage")
        .sort({lastMessageAt:-1});

        const formattedChats = chats.map(chat=>{
            const otherParticipants = chat.participants.filter(participant=>participant._id.toString()!==userId);
            return {
                _id: chat._id,
                participants: otherParticipants ?? null,
                lastMessage: chat.lastMessage,
                lastMessageAt: chat.lastMessageAt,
                createdAt: chat.createdAt,
            }
        })

        res.json(formattedChats);
    
    }
    catch(error){
        res.status(500);
        next(error);
    }
}

export async function getOrCreateChat(req:AuthRequest,res:Response,next:NextFunction){
    try{
        const userId = req.userId;
        const {participantId} = req.params;

        if(!participantId){
            res.status(400).json({message:"Participant ID is required"});
            return;
        }

    

        if(participantId===userId){
            res.status(400).json({message:"Cannot create chat with yourself"});
            return;
        }

        let chat = await Chat.findOne({
            participants: {$all: [userId,participantId]}
        })
        .populate("participants","name email avatar")
        .populate("lastMessage");

        if(!chat){
            const newChat = new Chat({participants: [userId,participantId]});
            chat = await newChat.save();
            chat = await chat.populate("participants","name email avatar");
        }   
        const otherParticipants = chat.participants.filter(participant=>participant._id.toString()!==userId);
        res.json({
            _id: chat._id,
            participants: otherParticipants ?? null,
            lastMessage: chat.lastMessage,
            lastMessageAt: chat.lastMessageAt,
            createdAt: chat.createdAt,
        })
    }
    catch(error){
        res.status(500);
        next(error);
    }
}