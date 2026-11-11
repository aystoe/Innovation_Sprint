export function validExternalUrl(value:string):boolean {
 try {const url=new URL(value);return url.protocol==='https:' && !!url.hostname && !url.username && !url.password && !/\s/.test(value)}catch{return false}
}
export function decodeEventImage(value:string):{mime:string;bytes:Uint8Array;extension:string}{
 const match=/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value)
 if(!match)throw new Error('Choose a JPEG, PNG or WebP image.')
 const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0))
 if(!bytes.length || bytes.length>5*1024*1024)throw new Error('Images must be between 1 byte and 5 MiB.')
 return {mime:match[1],bytes,extension:match[1]==='image/jpeg'?'jpg':match[1].split('/')[1]}
}
