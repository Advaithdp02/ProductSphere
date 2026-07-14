import crypto from "crypto";
import { Response, NextFunction } from "express";
import { redis } from "../config/redis";
import { AuthenticatedRequest } from "./apiKeyAuth";

const PLAN_LIMITS:Record<string,number>={
    free:100,
    basic:500,
    pro:1000,
    enterprise:10000
};

const WINDOW_SECONDS=24*60*60; //1 DAY

export const tierRateLimiter= async (
    req:AuthenticatedRequest,
    res:Response,
    next:NextFunction
)=>{
    try{
        const user=req.user;

        if(!user){
            return res.status(403).json({
                success:false,
                message:"USER NOT AUTHENTICATED"
            });
        }
        const limit=PLAN_LIMITS[user.plan] ||100;
        const apiKeyHash=crypto.createHash("sha256").update(user.apiKey).digest("hex");
        const redisKey=`rate:${apiKeyHash}`;
        const multi=redis.multi();
        multi.incr(redisKey);
        multi.expire(redisKey,WINDOW_SECONDS);
        const results=await multi.exec();
        const requestCount=results![0][1] as number;
        if(requestCount>limit){
            return res.status(429).json({
                success:false,
                message:"RATE LIMIT EXCEEDED"

            });
        }
        next();
    }catch(e){
        return res.status(500).json({
                success:false,
                message:"RATE LIMITING FAILED"
            });
    }
}