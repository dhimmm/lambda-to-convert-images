import { S3 } from "@aws-sdk/client-s3";
import sharp from "sharp";

const s3 = new S3();

export const handler = async (event) => {
  const bucketForOutput = "prepared-images";

  const record = event.Records[0];
  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

  try {
    const { ContentType, Body } = await s3.getObject({
      Bucket: bucket,
      Key: key,
    });

    if (ContentType !== "image/png") {
      const chunks = [];
      for await (const chunk of Body) {
        chunks.push(chunk);
      }
      const imageBuffer = Buffer.concat(chunks);

      const convertedImage = await sharp(imageBuffer)
        .png({ quality: 50 })
        .toBuffer();

      await s3.putObject({
        Bucket: bucketForOutput,
        Key: `${key}.png`,
        Body: convertedImage,
        ContentType: "image/png",
      });
    } else {
      await s3.copyObject({
        CopySource: `${bucket}/${key}`,
        Bucket: bucketForOutput,
        Key: key,
      });
    }

    await s3.deleteObject({ Bucket: bucket, Key: key });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Image processed successfully" }),
    };
  } catch (error) {
    console.error("Error processing image:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Image processing failed",
        error: error.message,
      }),
    };
  }
};
