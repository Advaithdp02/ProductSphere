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
        const redisKey=`rate:${user.apiKey}`;
        const requestCount= await redis.incr(redisKey);
        if(requestCount===1){
            await redis.expire(redisKey,WINDOW_SECONDS);
        }
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