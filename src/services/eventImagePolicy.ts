export function isDefaultEventImagePath(path?:string|null){return !!path?.split('/').at(-1)?.startsWith('default-')}
export function eventImagePlan(inputImage:string|undefined,previous?:{image?:string;imagePath?:string;imageIsDefault?:boolean}){
 const keep=!!previous && !inputImage && (previous.imageIsDefault===true || (!!previous.imagePath&&!previous.image))
 return {keep,needsDefault:!inputImage&&!keep,isDefault:keep?previous?.imageIsDefault===true:!inputImage}
}
