import DownStream1 from './imgs/downstream-1.png';
import DownStream2 from './imgs/downstream-2.png';
import DownStream3 from './imgs/downstream-3.png';
import DownStream4 from './imgs/downstream-4.png';
import DownStream5 from './imgs/downstream-5.png';
import DownStream98 from './imgs/downstream-98.png';
import DownStream99 from './imgs/downstream-99.png';
import DownStream100 from './imgs/downstream-100.png';
import CenterImg from './imgs/center.png';
import CenterBtn from './imgs/center-btn.svg';
import DetailBtn from './imgs/detail-btn.svg';
import CenterDetailBtn from './imgs/center-detail-btn.png';
import EditBtn from './imgs/edit-btn.png';
import UploadBtn from './imgs/upload-btn.png';
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { saveAs } from 'file-saver';
import axios from 'axios';
import './index.css';
import { useImgBase64 } from './hook';

/* enter 数据集个数（data）>选择集个数（DOM）
update 数据集个数（data）= 选择集个数（DOM）
exit 数据集个数（data）< 选择集个数（DOM）
*/

/* key-value形式数据获取key */
function getKey(val) {
    if (val) {
        val = `${val}`;
        return val.split('-')[0];
    }
    return '';
}

/* 将设备关系图片导出成png */
function exportToPng(width, height) {
    var doctype = '<?xml version="1.0" standalone="no"?>'
        + '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';
    var source = (new XMLSerializer()).serializeToString(d3.select('#deviceMap').selectAll('svg').node());
    var blob = new Blob([doctype + source], { type: 'image/svg+xml;chartset=utf-8' });
    var url = window.URL.createObjectURL(blob);
    var downloadImg = document.createElement('img');
    downloadImg.src = url;
    downloadImg.onload = (e) => {
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.drawImage(downloadImg, 0, 0);
        canvas.toBlob(function (blob) {
            saveAs(
                blob
                , "1.png"//保存文件名称
            );
        }, "image/png");
    }
}

const prefix = 'kz-device-mapping';
const id = '31011020001328001002';
export default function Mapping() {
    const mapDataRef = useRef({
        nodes: [],
        links: []
    });
    const mapSvgDataRef = useRef({
        svg_nodes: [],
        svg_links: []
    })
    const simulationD3Ref = useRef();
    const imgsBase64Map = useImgBase64([
        [0, CenterImg],
        [1, DownStream1],
        [2, DownStream2],
        [3, DownStream3],
        [4, DownStream4],
        [5, DownStream5],
        [98, DownStream98],
        [99, DownStream99],
        [100, DownStream100]
    ]);
    const deviceMap = useRef(null);
    const tooltip = useRef(null);
    const hoverItem = {}; /* 鼠标悬浮项 */

    useEffect(() => {
        if (Object.keys(imgsBase64Map).length === 9) {
            axios.get('/data-device.json').then(r => {
                (r.data.rel || []).forEach(item => {
                    item.source = item.startNode;
                    item.target = item.endNode;
                });
                mapDataRef.current = {
                    nodes: r.data.node,
                    links: r.data.rel
                };
                initGraph();
    
            })
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [imgsBase64Map]);


    function initGraph() {
        const width = deviceMap.current.offsetWidth;
        const height = deviceMap.current.offsetHeight;
        simulationD3Ref.current = d3.forceSimulation()
            // .force('boundary', forceBoundary(0, 0, 860, 677))
            .force("link", d3.forceLink() // This force provides links between nodes
                .id(d => d.id) // This sets the node id accessor to the specified function. If not specified, will default to the index of a node.
                .distance(160)
            )
            .force("charge", d3.forceManyBody().strength(-160)) // This adds repulsion (if it's negative) between nodes. 
        // .force('center', d3.forceCenter(width/2, height/2));
        const svg = d3.select("#deviceMap")
            .append("svg")
            .attr("class", "wc-svg")
            .attr('style', 'background:#F6F9FD')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('width', '100%')
            .attr('height', '100%');
        const g = svg.append("g");

        /* 缩放、整体拖拽平移功能 */
        const zoom = d3.zoom().scaleExtent([0, 2]).on("zoom", e => {
            g.attr("transform", e.transform);
        });
        svg.call(zoom).call(zoom.transform, d3.zoomIdentity);

        /* 画箭头 */
        g.append('defs').append('marker')
            .attr("id", 'arrowhead')
            .attr('viewBox', '-0 -5 10 10') // the bound of the SVG viewport for the current SVG fragment. defines a coordinate system 10 wide and 10 high starting on (0,-5)
            .attr('refX', 53) // x coordinate for the reference point of the marker. If circle is bigger, this need to be bigger.
            .attr('refY', 0)
            .attr('orient', 'auto') /* 改属性将旋转marker元素内的形状以适合引用它的路径 */
            .attr('markerWidth', 8)
            .attr('markerHeight', 8)
            .attr('xoverflow', 'visible')
            .attr('markerUnits', 'strokeWidth')
            .append('svg:path')
            .attr('d', 'M 0,-5 L 10 ,0 L 0,5') /* 尖端朝右 */
            .attr('fill', '#999')
            .style('stroke', 'none');

        // 节点间的连接线&&箭头
        mapSvgDataRef.current.svg_links = g.append('g').selectAll(".links")
            .data(mapDataRef.current.links)
            .enter()
            .append("line")
            .attr('class', 'links')
            .attr('style', 'stroke:#cccccc;stroke-width:1px;')
            .attr('marker-end', 'url(#arrowhead)');

        /* 绘制节点 */
        mapSvgDataRef.current.svg_nodes = g.append('g').selectAll(".nodes")
            .data(mapDataRef.current.nodes)
            .enter()
            .append('g')
            .attr('class', 'nodes')
            .call(drag(simulationD3Ref.current));

        /* 设备图片节点 */
        mapSvgDataRef.current.svg_nodes
            .append("image")
            .attr('width', 80)
            .attr('height', 80)
            .attr('class', 'img-node')
            .attr('style', 'transform: translate(-40px, -40px)')
            .attr('xlink:href', function (d) {
                const sxjlx = getKey(d.detail[3].value);
                if (isCenterNode(d)) { /* 中心节点 */
                    if (imgsBase64Map[0]) {
                        return imgsBase64Map[0];
                    }
                } else {
                    if (imgsBase64Map[sxjlx]) {
                        return imgsBase64Map[sxjlx];
                    } else {
                        // console.log('非法摄像机类型：', d)
                        /* 没有对应的类型，统一使用其他 */
                        return imgsBase64Map[99];
                    }
                }
            })

        /* 监听图片节点点击事件 */
        mapSvgDataRef.current.svg_nodes.selectAll('.img-node').on('click', (d) => {
            d3.select(".kz-device-mapping-tooltip").attr('style', `display:none;`);
            const item = d.srcElement.__data__;
            if (item.detail[0].value === id) { /* 中心节点 */
                if (d3.select('.center-sxbtn').nodes().length) {
                    d3.select('.center-sxbtn').remove();
                } else {
                    const temp = d3.select(d.target.parentElement).insert('g', '.img-node')
                        .attr('class', 'center-sxbtn');
                    createSectorMenu(temp, width, height);
                }
            } else {
                if (d3.select('.node-btns').nodes().length) {
                    d3.select('.node-btns').remove();
                } else {
                    const temp = d3.select(d.target.parentElement).insert('g', 'img-node')
                        .attr('class', 'node-btns');
                    createOptBtns(temp)
                }
            }
        }).on('mouseenter', d => {
            const temp = d.srcElement.__data__;
            tooltip.current.innerHTML = temp.name;
            hoverItem.id = temp.id;
            hoverItem.startDate = new Date().getTime();
            if (hoverItem.t$) {
                clearTimeout(hoverItem.t$);
                hoverItem.t$ = null;
            }
            hoverItem.t$ = setTimeout(() => {
                d3.select(".kz-device-mapping-tooltip").attr('style', `display:block;position:absolute;left:${d.offsetX}px;top:${d.offsetY - 40}px`);
                clearTimeout(hoverItem.t$);
                hoverItem.t$ = null;
            }, 500);
        }).on('mouseleave', d => {
            if (hoverItem.t$) {
                clearTimeout(hoverItem.t$);
                hoverItem.t$ = null;
            } else {
                d3.select(".kz-device-mapping-tooltip").attr('style', `display:none;`);
            }
        });
        // Listen for tick events to render the nodes as they update in your Canvas or SVG. 力导图布局
        simulationD3Ref.current
            .nodes(mapDataRef.current.nodes)
            .on("tick", () => ticked(width, height));

        simulationD3Ref.current.force("link")
            .links(mapDataRef.current.links);

    }
    function ticked(width, height) {
        mapSvgDataRef.current.svg_links.attr("x1", d => {
            return d.source.x;
        })
        .attr("y1", d => {
            return d.source.y;
        })
        .attr("x2", d => {
            return d.target.x;
        })
        .attr("y2", d => {
            return d.target.y;
        });
        mapSvgDataRef.current.svg_nodes.attr("transform", d => {
            if (isCenterNode(d)) {
                if (!d.f && !d.fy) { /* 初次渲染给中心节点指定位置 */
                    d.fx = width / 2;
                    d.fy = height / 2;
                }
            }
            return `translate(${d.x},${d.y})`
        }
        );
    }

    function drag(simulation) {
        return d3.drag()
        .on("start", (event) => {
            if (!event.active) simulation.alphaTarget(0.3).restart(); /* 设置衰减系数，对节点位置移动过程的模拟，数值越高移动越快，数值范围（0， 1） */
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        })
        .on("drag", (event) => {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        })
    }

    /* 判断是否是中心节点 */
    function isCenterNode(node) {
        return node.detail[0].value === id;
    }

    /* 创建围绕中心节点的扇形菜单---并监听 */
    function createSectorMenu(temp, width, height) {
        temp.append('path')
            .attr('fill', 'none')
            .attr('class', 'center-menu center-menu1')
            .attr('d', function (d) {
                return 'M0,0 L80,0 A80,80 0 0 0 -40 -69.3';
            }).on('click', (d) => {
                // setDetailInfo(d.srcElement.__data__)
                // setVisible(true);
            });
        temp.append("path")
            .attr('fill', 'none')
            .attr('class', 'center-menu center-menu2')
            .attr('d', function (d) {
                return 'M0,0 L80,0 A80,80 0 0 0 -40 -69.3';
            }).on('click', (d) => {
                exportToPng(width, height);
            });
        temp.append("path")
            .attr('fill', 'none')
            .attr('class', 'center-menu center-menu3')
            .attr('d', function (d) {
                return 'M0,0 L80,0 A80,80 0 0 0 -40 -69.3';
            }).on('click', (d) => {
                console.warning('建设中~');
            });
        temp.append("image")
            .attr('width', 20)
            .attr('height', 20)
            .attr('class', 'btn1')
            .attr('xlink:href', function (d) {
                return EditBtn;
            }).on('click', (d) => {
                console.warning('建设中~');
            });
        temp.append("image")
            .attr('width', 20)
            .attr('height', 20)
            .attr('class', 'btn2')
            .attr('xlink:href', function (d) {
                return CenterDetailBtn;
            }).on('click', (d) => {
                // setDetailInfo(d.srcElement.__data__)
                // setVisible(true);
            });
        temp.append("image")
            .attr('width', 20)
            .attr('height', 20)
            .attr('class', 'btn3')
            .attr('xlink:href', function (d) {
                return UploadBtn;
            }).on('click', (d) => {
                exportToPng(width, height);
            });
    }

    /* 创建设为中心、查看设备详情btn */
    function createOptBtns(temp) {
        temp.append("image")
            .attr('width', 164)
            .attr('height', 56)
            .attr('class', 'center-btn')
            .attr('xlink:href', function (d) {
                return CenterBtn;
            }).on('click', d => {
                console.log('建设中~');
            });
        temp.append("image")
            .attr('width', 208)
            .attr('height', 56)
            .attr('class', 'detail-btn')
            .attr('xlink:href', function (d) {
                return DetailBtn;
            }).on('click', d => {
                console.log('查看详情');
                // setDetailInfo(d.srcElement.__data__)
                // setVisible(true);
            });
    }

    function downNodes() {
        axios.get('/data-device-section.json').then(r => {
            (r.data.rel || []).forEach(item => {
                item.source = item.startNode;
                item.target = item.endNode;
            });
            mapDataRef.current.nodes = mapDataRef.current.nodes.filter(i => i.id === 3065702 || i.id === 3065667);
            mapDataRef.current.links = mapDataRef.current.links.filter(i => i.id === 8228715);

            mapSvgDataRef.current.svg_links = mapSvgDataRef.current.svg_links.filter(function(e) {
                if (r.data.rel.findIndex(r => r.startNode === e.startNode && r.endNode === e.endNode) === -1) {
                    d3.select(this).remove();
                    return false;
                }
                return true;
            })
            /* 绘制节点 */
            mapSvgDataRef.current.svg_nodes = mapSvgDataRef.current.svg_nodes.filter(function(e) {
                if(r.data.node.findIndex(n => n.id === e.id) === -1) {
                    d3.select(this).remove();
                    return false;
                }
                return true;
            })

        })
    }

    function downNodes2() {
        axios.get('/data-device.json').then(r => {
            (r.data.rel || []).forEach(item => {
                item.source = item.startNode;
                item.target = item.endNode;
            });
            mapDataRef.current.nodes.push({
                "id": 3065695,
                "name": "荆州路长阳路南约5米（西）HG",
                "nodeType": "设备",
                "nodeTypeId": "7",
                "detail": [
                    {
                        "key": "设备编号",
                        "value": "31011020001321009007"
                    },
                    {
                        "key": "设备名称",
                        "value": "荆州路长阳路南约5米（西）HG"
                    },
                    {
                        "key": "摄像机功能类型",
                        "value": "2-人脸识别"
                    },
                    {
                        "key": "摄像机类型",
                        "value": "3-固定枪机"
                    },
                    {
                        "key": "设备坐标",
                        "value": "121.51025800000000000000,31.26106600000000000000"
                    },
                    {
                        "key": "行政区划",
                        "value": "310110-杨浦区"
                    }
                ]
            });
            mapDataRef.current.links.push({
                "id": 8228723,
                "version": null,
                "type": "Downstream",
                "source": 3065702,
                "target": 3065695,
                "primaryIdName": null,
                "propertyList": []
            });
            mapSvgDataRef.current.svg_nodes = mapSvgDataRef.current.svg_nodes.data(mapDataRef.current.nodes)
            .enter()
            .append('g')
            .attr('class', 'nodes')
            .merge(mapSvgDataRef.current.svg_nodes)
            .call(drag(simulationD3Ref.current))

            mapSvgDataRef.current.svg_nodes.each(function(e) {
                const t = d3.select(this);
                if (t.select('image').size() === 0) {
                    t.append("image")
                    .attr('width', 80)
                    .attr('height', 80)
                    .attr('class', 'img-node')
                    .attr('style', 'transform: translate(-40px, -40px)')
                    .attr('xlink:href', function () {
                        const sxjlx = getKey(e.detail[3].value);
                        if (isCenterNode(e)) { /* 中心节点 */
                            if (imgsBase64Map[0]) {
                                return imgsBase64Map[0];
                            }
                        } else {
                            if (imgsBase64Map[sxjlx]) {
                                return imgsBase64Map[sxjlx];
                            } else {
                                // console.log('非法摄像机类型：', d)
                                /* 没有对应的类型，统一使用其他 */
                                return imgsBase64Map[99];
                            }
                        }
                    })
                }
            })

            
            // 节点间的连接线&&箭头
            mapSvgDataRef.current.svg_links = mapSvgDataRef.current.svg_links
            .data(mapDataRef.current.links)
            .enter()
            .append("line")
            .attr('class', 'links')
            .attr('style', 'stroke:#cccccc;stroke-width:1px;')
            .attr('marker-end', 'url(#arrowhead)')
            .merge(mapSvgDataRef.current.svg_links);

            simulationD3Ref.current.nodes(mapDataRef.current.nodes);
            simulationD3Ref.current.force('link').links(mapDataRef.current.links);
            simulationD3Ref.current.alphaTarget(1).restart();
        })
    }

    return (
        <div className={`${prefix}`} id="deviceMap" ref={deviceMap}>
            <div className={`${prefix}-tooltip`} ref={tooltip}>
            </div>
            <button onClick={downNodes}>隐藏关系及节点</button>
            <button onClick={downNodes2}>拓展关系及节点</button>
        </div>
    )
}