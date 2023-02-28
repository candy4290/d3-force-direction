import { useEffect, useState } from "react";

const prefix = 'wc-mapbtn';

function colorRgba(sHex, alpha) {
    return 'rgba(' + parseInt('0x' + sHex.slice(1, 3), 0) + ','
      + parseInt('0x' + sHex.slice(3, 5), 0) + ',' + parseInt('0x' + sHex.slice(5, 7), 0) + ',' + alpha + ')';
  }
  

/* 关系图谱上的button组件 */
export default function MapBtn({style, name = '违法', color = '#FF3B3B', onClick, disabled, cannotUse}) {
    const [boxShadow, setBoxShadow] = useState('');
    useEffect(() => {
        setBoxShadow(`0px 2px 4px 0px ${colorRgba(color, 0.3)}`);
        if (disabled) {
            setBoxShadow(`0px 2px 4px 0px ${colorRgba(color, 0.3)}`);
        } else {
            setBoxShadow(`0px 2px 4px 0px ${colorRgba('#666666', 0.3)}`);
        }
    }, [color, disabled]);
    function changeStatus() {
        if (onClick) {
            onClick();
        }
    }
    return <>
        {
            cannotUse ? 
                <div className={prefix} style={{boxShadow: boxShadow, ...style, opacity: .5, cursor: 'not-allowed'}}>
                    <div style={{background: '#666666', boxShadow: boxShadow}}>{name}</div>
                </div>
            :
            <div className={prefix} style={{boxShadow: boxShadow, ...style}} onClick={changeStatus}>
                <div style={{background: !disabled ? color : '#666666', boxShadow: boxShadow}}>{name}</div>
            </div>
        }
    </>
    
}
