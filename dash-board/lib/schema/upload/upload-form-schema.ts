import { z } from "zod";

export const uploadFormSchema = z.object({
    video: z.instanceof(File).nullable(),
    title: z.string().min(1).max(100),
})  

export type UploadFormSchema = z.infer<typeof uploadFormSchema>