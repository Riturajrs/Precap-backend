const jwt = require('jsonwebtoken')

const signToken = (userId, email) => {
  const jwtSecretKey = process.env.JWT_SECRET_KEY
  const data = {
    time: Date(),
    userId,
    email
  }

  options = { expiresIn: '1h' }

  const signedToken = jwt.sign(data, jwtSecretKey, options)
  return signedToken
}

const verifyToken = async(req, res, next) => {
  const token = req.header('Authorization')
  const jwtSecretKey = process.env.JWT_SECRET_KEY
  try {
    const decodedData = await jwt.verify(token, jwtSecretKey)
    res.decodedData = decodedData
    next()
  } catch (error) {
    res.status(401).json({ error: 'Sign in again' });
  }
}

exports.signToken = signToken
exports.verifyToken = verifyToken
