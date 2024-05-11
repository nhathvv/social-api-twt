import { getNameFromFullName, handleUploadImage, handleUploadVideo } from '~/utils/file'
import sharp from 'sharp'
import { Request } from 'express'
import path from 'path'
import { UPLOAD_IMAGE_DIR } from '~/constants/dir'
import fs from 'fs'
import { isProduction } from '~/constants/config'
import { config } from 'dotenv'
import { MediaTypes } from '~/constants/enums'
import { Media } from '~/models/Others'
import { encodeHLSWithMultipleVideoStreams } from '~/utils/video'
import { promises as fsPromise } from 'fs'
config()
class MediaService {
  async uploadImage(req: Request) {
    const files = await handleUploadImage(req)
    const result: Media[] = await Promise.all(
      files.map(async (file) => {
        const newName = getNameFromFullName(file.newFilename)
        const newPath = path.resolve(UPLOAD_IMAGE_DIR, `${newName}.jpg`)
        await sharp(file.filepath).jpeg({}).toFile(newPath)
        fs.unlinkSync(file.filepath)
        return {
          url: isProduction
            ? `${process.env.HOST}/medias/${newName}.jpg`
            : `http://localhost:4000/static/${newName}.jpg`,
          type: MediaTypes.Image
        }
      })
    )
    return result
  }
  async uploadVideo(req: Request) {
    const files = await handleUploadVideo(req)
    const result: Media[] = await Promise.all(
      files.map(async (file) => {
        return {
          url: isProduction
            ? `${process.env.HOST}/medias/${file.newFilename}`
            : `http://localhost:4000/static/video/${file.newFilename}`,
          type: MediaTypes.Video
        }
      })
    )
    return result
  }
  async uploadVideoHLS(req: Request) {
    const files = await handleUploadVideo(req)
    const result: Media[] = await Promise.all(
      files.map(async (file) => {
        await encodeHLSWithMultipleVideoStreams(file.filepath)
        await fsPromise.unlink(file.filepath)
        const newName = getNameFromFullName(file.newFilename)
        return {
          url: isProduction
            ? `${process.env.HOST}/medias/video-hls/${newName}.m3u8`
            : `http://localhost:4000/static/video-hls/${newName}.m3u8`,
          type: MediaTypes.HLS
        }
      })
    )
    return result
  }
}
const mediaService = new MediaService()
export default mediaService