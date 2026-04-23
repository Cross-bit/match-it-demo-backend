import jwt from "jsonwebtoken"
import { Request, Response, NextFunction } from "express"
import { env } from "../config/env";


/*export interface Request extends Request {
  userData: any
}*/


/**
 * For authentication we need a way to
 * keep userData in the Request for the subsequent calls
 * (this should be in the custom.d.ts file but it did not work for me and we are running
 * out of time, this has to be enough.)
 */
declare global
{
   namespace Express {
    export interface Request {
       userData?: any
    }
 }
 }


export function authenticateToken(req: Request, res: Response, next: NextFunction) {

    const authHeader = req.headers['authorization']

    const token = authHeader && authHeader.split(' ')[1]

    if (token == null)
      return res.status(401).send({
          name: "MISSING_AUTHENTICATION_TOKEN",
          message: "Missing bearer authentication token",
          status: 401
      })

    jwt.verify(token, env.ACCESS_TOKEN_SECRET, (err, user) => {

      if (err) {
        return res.status(403).send({
          name: "ACCESS_TOKEN_EXPIRED",
          message: "Access token has expired, refresh of the token or relogin is needed",
          status: 403
        });
      }

      console.log(user); // here we leave it as it is
      req.userData = user

      next()
    })
}