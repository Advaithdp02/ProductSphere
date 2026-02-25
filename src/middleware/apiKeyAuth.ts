import { Request,Response,NextFunction } from "express";
import { IUser,User } from "../models/user.model";

export interface AuthenticatedRequest extends Request {
    user?: IUser;
}

export const apiKeyAuth= async ( 
    req: AuthenticatedRequest,
    res:Response,
    next:NextFunction
)=>{
    try{
        const apiKey=req.header("x-api-key");


        if(!apiKey){
            return res.status(401).json({
                success:false,
                message:"API KEY IS MISSING!!"
            });
        }
        const user=await User.findOne({apiKey});

        if(!user){
            return res.status(401).json({
                success:false,
                message:"API KEY IS INVALID!!"
            });
        }
        req.user=user;
        next();
    }catch(e){
        return res.status(500).json({
            success:false,
            message:"Authentication Failed"
        });
    }

};