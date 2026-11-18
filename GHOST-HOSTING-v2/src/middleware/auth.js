export function requireAuth(req,res,next){if(!req.session.user)return res.status(401).json({error:"Sign in required"});next()}
export function requireAdmin(req,res,next){if(req.session.user?.role!=="admin")return res.status(403).json({error:"Admin only"});next()}
