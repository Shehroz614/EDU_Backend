export {}
declare global {
    namespace Express {
        export interface Request {
            userData?: {
                uid: string,
                email: string,
            }
        }
    }
}
