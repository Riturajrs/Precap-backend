const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const HttpError = require('./models/http-error')
const Routes = require('./Routes/routes')
const CORS = require('cors')
const dotenv = require('dotenv')

dotenv.config()

const app = express()

app.use(bodyParser.json())

app.use(CORS())

app.use('/api', Routes)

app.use((req, res, next) => {
  const error = new HttpError('Could not find this route.', 404)
  throw error
})

app.use((error, req, res, next) => {
  res.status(error.code || 500)
  res.json({ message: error.message || 'An unknown error occurred!' })
})

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.22ccrab.mongodb.net/?retryWrites=true&w=majority`,
    { dbName: process.env.DB_NAME }
  )
  .then(() => {
    app.listen(process.env.PORT || 5000)
    console.log(`Running on port: ${process.env.PORT || 5000}`)
  })
  .catch(err => {
    console.log(err)
  })
