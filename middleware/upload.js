const crypto = require('crypto')
const {
  MongoClient,
  ServerApiVersion,
  GridFSBucket,
  ObjectId
} = require('mongodb')
const path = require('path')

const uploadFile = async (file, bucketName, metadata) => {
  const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.22ccrab.mongodb.net/?retryWrites=true&w=majority`

  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true
    }
  })

  try {
    await client.connect()
    await client.db('admin').command({ ping: 1 })
    const fileBuffer = file.buffer
    const db = await client.db(process.env.DB_NAME)
    const buf = crypto.randomBytes(16)

    const filename = buf.toString('hex') + path.extname(file.originalname)
    const bucket = await new GridFSBucket(db, { bucketName })

    const uploadStream = await bucket.openUploadStream(filename, {
      chunkSizeBytes: 1048576,
      metadata
    })

    await uploadStream.end(fileBuffer)

    await uploadStream.on('finish', fileData => {
      client.close()
    })

    await uploadStream.on('error', err => {
      client.close()
    })

    return uploadStream
  } catch (err) {
    throw err
  }
}

const getFile = async (fileId, bucketName,res) => {
  const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.22ccrab.mongodb.net/?retryWrites=true&w=majority`

  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true
    }
  })
  try {
    await client.connect()

    const db = await client.db(process.env.DB_NAME)

    const bucket = await new GridFSBucket(db, { bucketName })

    bucket.openDownloadStream(new ObjectId(fileId)).pipe(res)
    .on('error', (err) => {
      res.status(404).send('File not found');
    });
  } catch (err) {
    console.log(err)
  }
}

const deleteFile = async (fileId, bucketName) => {
  const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.22ccrab.mongodb.net/?retryWrites=true&w=majority`

  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true
    }
  })
  try {
    await client.connect()
    await client.db('admin').command({ ping: 1 })
    const db = await client.db(process.env.DB_NAME)
    const bucket = await new GridFSBucket(db, { bucketName })
    const fileIdObject = new ObjectId(fileId)
    await bucket.delete(fileIdObject)
  } catch (err) {
    console.log(err)
  } finally {
    client.close()
  }
}

exports.uploadFile = uploadFile
exports.getFile = getFile
exports.deleteFile = deleteFile
