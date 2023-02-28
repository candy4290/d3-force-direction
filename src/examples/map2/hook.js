import { useEffect, useState } from "react";

function getBase64Image(img) {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, img.width, img.height);
    const ext = img.src.substring(img.src.lastIndexOf(".") + 1).toLowerCase();
    const dataURL = canvas.toDataURL("image/" + ext);
    return dataURL;
}


function dealImgBase64(id, src, callBack) {
    const image = new Image();
    image.src = src;
    image.onload = () => {
        callBack(a => ({ ...a, [id]: getBase64Image(image) }));
    }
}

export function useImgBase64(arr) {
    const [imgsBase64Map, setImgsBase64Map] = useState({});
    useEffect(() => {
        arr.forEach(i => {
            dealImgBase64(i[0], i[1], setImgsBase64Map)
        })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(arr)]);
    return imgsBase64Map;

}