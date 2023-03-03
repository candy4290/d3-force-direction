import { useEffect, useRef, useState } from "react";
import * as d3 from 'd3';
import MapBtn from "./map-btn";
import forceBoundary from 'd3-force-boundary';
import './index.css';
import axios from 'axios';

const prefix = 'wc-map';

// const id = '沪L86466'; // data-vehicle-20230223.json
const id = '沪AB1234'; // data-vehicle.json

/* 车辆关系图谱 */
export default function Mapping() {
    const [status, setStatus] = useState([false, false, false, false]); /* 违法、事故、警情、车主 */
    const [isActive, setIsActive] = useState(false);
    const [dataSet, setDataSet] = useState([]);
    const [simulationD3, setSimulation] = useState();
    const [filterNodes, setFilterNodes] = useState([]);
    const [filterLinks, setFilterLinks] = useState([]);
    const [nodeInfo, setNodeInfo] = useState();
    const [centerNode, setCenterNode] = useState();
    let lastCircle /* 上一个被点击过的节点 */
    const [cannotUseInfo, setCannotUseInfo] = useState({
        车主: false,
        车辆: false,
        违法: false,
        事故: false,
        警情: false,
        车企: false,
    });
    const [nodeColor] = useState({
        '车主': '#06C270',
        '车辆': '#2C65F0',
        '违法': '#FF3B3B',
        '事故': '#FF8800',
        '警情': '#FFCC00',
        '车企': '#00E5F1'
    });
    useEffect(() => {
        if (nodeInfo) {
            console.log(nodeInfo)
        }
    }, [nodeInfo])
    const vehicleMap = useRef(null);
    useEffect(() => {
        axios.get('./data-vehicle.json').then(r => {
        // axios.get('./data-vehicle-20230223.json').then(r => {
            r.data.rel.forEach(item => {
                item.source = item.startNode;
                item.target = item.endNode;
            });
            setDataSet(r.data);
            initGraph(r.data);
        })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (dataSet) {
            const temp = {
                车主: cannotUse('车主'),
                车辆: cannotUse('车辆'),
                违法: cannotUse('违法'),
                事故: cannotUse('事故'),
                警情: cannotUse('警情'),
                车企: cannotUse('车企'),
            };
            setCannotUseInfo(temp);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataSet]);

    function initGraph(data, flag = false) {
        const width =  vehicleMap.current.offsetWidth;
        const height =  vehicleMap.current.offsetHeight;
        console.log(width, height)
        if (flag && simulationD3) {
            simulationD3.stop()
            d3.select('#fd').selectAll('svg').remove();
        }
        const simulation = d3.forceSimulation()
            // .force('boundary', forceBoundary(0, 0, width, height))
            .force("charge", d3.forceManyBody().distanceMax(260).strength(-160))
            .force("link", 
                d3.forceLink() // This force provides links between nodes
                .id(d => d.id) // This sets the node id accessor to the specified function. If not specified, will default to the index of a node.
                .distance(260)
                .strength(1)
            )
            .force('collision', d3.forceCollide().radius(30)) /* 节点碰撞力;根据节点层级来；层级越大力越小 */
            // .force('center', d3.forceCenter(width/2, height/2));
            
        setSimulation(simulation);
        const svg = d3.select("#fd")
            .append("svg")
            .attr("class", "wc-svg")
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('width', '100%')
            .attr('height', '100%');
        const g = svg.append("g");

        /* 缩放、整体拖拽平移功能 */
        const zoom = d3.zoom().scaleExtent([0, 2]).on("zoom", e => {
            g.attr("transform", e.transform);
        });
        svg.call(zoom).call(zoom.transform, d3.zoomIdentity)

        /* 画箭头 */
        g.append('defs').append('marker')
            .attr("id", 'arrowhead-车主')
            .attr('viewBox', '-0 -12 16 24') // the bound of the SVG viewport for the current SVG fragment. defines a coordinate system 10 wide and 10 high starting on (0,-5)
            .attr('refX', -24) // x coordinate for the reference point of the marker. If circle is bigger, this need to be bigger.
            .attr('refY', 0)
            .attr('orient', 'auto')
            .attr('markerWidth', 11)
            .attr('markerHeight', 11)
            .attr('xoverflow', 'visible')
            .attr('markerUnits', 'strokeWidth')
            .append('svg:path')
            .attr('d', 'M0 -12 L16 0 L0 12 Q16 0 0 -12')
            .attr('fill', '#06C270')
            .style('stroke', 'none');
        Object.keys(nodeColor).forEach(i => {
            if (i!== '车主') {
                g.select('marker').clone(true)
                    .attr("id", 'arrowhead-' + i)
                    .select('path')
                    .attr('fill', nodeColor[i])
            }
        })

        let centerNodeTemp;
        if (!centerNode) {
            centerNodeTemp = data.node.filter(item => item.name === id)[0];
            setCenterNode(centerNodeTemp); /* 中心节点 */
        } else {
            centerNodeTemp = centerNode;
        }

        // 节点间的连接线&拼接上箭头
        const linksP = g.append('g').attr('class', 'links-all').selectAll(".links")
            .data(data.rel)
            .enter()
            .append('g')

        const links = linksP.append("polyline")
            .attr("class", "links")
            .attr('marker-mid', 
                d => {
                    return `url(#arrowhead-${d.type})`
                }
            );
        
        const textRect = linksP
            .append('rect')
            .attr('width', 50)
            .attr('height', 25)
            .attr('rx', 12.5)
            .attr('fill', d => nodeColor[d.type])

        const edgelabels = linksP
            .append('text')
            .style("pointer-events", "none")
            .attr('class', 'edgelabel')
            .attr('font-size', 10)
            .attr("text-anchor", 'middle')
            .attr('fill', '#aaa').text(d => d.type);

        // Initialize the nodes
        const nodes = g.append('g').attr('class', 'nodes-all').selectAll(".nodes")
            .data(data.node)
            .enter()
            .append("g")
            .attr("class", "nodes")
            .call(drag(simulation)); 

        nodes.append("circle")
            .attr("r", d => d.id === centerNodeTemp.id ? 30 : 13)
            .style("stroke", "#fff")
            .style("stroke-width", d => d.id === centerNodeTemp.id ? 10 : 14)
            .attr('class', 'wc-node-circle')
            .style("fill", d => nodeColor[d.nodeType]);
        
        nodes.append("text")
            .attr("dy", d => d.id === centerNodeTemp.id ? 52 : 36)
            .attr("text-anchor", 'middle')
            .text(d => d.name)
            .style('fill', '#ffffff');
        
        /* 监听节点点击事件 */
        nodes.selectAll('circle').on('click', (d) => {
            const item = d.srcElement.__data__;
            if (item.id === centerNodeTemp.id) { /* 中心节点不可点击 */
                return;
            }
            if (lastCircle && lastCircle !== d.srcElement) {
                lastCircle.setAttribute('r', 13);
                lastCircle.style['stroke-width'] = 14;
                lastCircle.__data__.isActive = false;
            }
            lastCircle = d.srcElement;
            item.isActive = !item.isActive;
            if (item.isActive) {
                d.srcElement.setAttribute('r', 17);
                d.srcElement.style['stroke-width'] = 6;
                setNodeInfo({
                    title: item.nodeType,
                    detail: item.detail
                });
            } else {
                d.srcElement.setAttribute('r', 13);
                d.srcElement.style['stroke-width'] = 14;
            }
            setIsActive(item.isActive);
        });

        // Listen for tick events to render the nodes as they update in your Canvas or SVG.
        simulation
            .nodes(data.node)
            .on("tick", () => ticked(links, nodes, edgelabels, textRect, width, height));

        simulation.force("link")
            .links(data.rel);

    }
    function ticked(links, nodes, edgelabels, textRect, width, height) {
        links.attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
        links.attr('points', d => `${d.source.x},${d.source.y}  ${(d.source.x+d.target.x)/2},${(d.source.y + d.target.y)/2} ${d.target.x},${d.target.y} `)
        nodes.attr("transform", d => {
            if (isCenterNode(d)) {
                if (!d.f && !d.fy) { /* 初次渲染给中心节点指定位置 */
                    d.fx = width/2 - 40;
                    d.fy = height/2;
                }
            }
            return `translate(${d.x},${d.y})`}
        );
        textRect
        .attr('x', function (d) { return (d.source.x + d.target.x) / 2 - 25 })
        .attr('y', function (d) { return (d.source.y + d.target.y) / 2 - 12.5 })
        .attr('transform', d => {
            return `rotate(${angel(d.source, d.target)} ${(d.source.x + d.target.x) / 2} ${(d.source.y + d.target.y) / 2})`
        })
        edgelabels
        .attr('x', function (d) { return (d.source.x + d.target.x) / 2 })
        .attr('y', function (d) { return (d.source.y + d.target.y) / 2 + 5 })
        .attr('transform', d => {
            return `rotate(${angel(d.source, d.target)} ${(d.source.x + d.target.x) / 2} ${(d.source.y + d.target.y) / 2})`
        })
    }

    /* 判断是否是中心节点 */
    function isCenterNode(node) {
        return node.detail[0].value === id;
    }

    function drag(simulation) {
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(1).restart(); /* 设置衰减系数，对节点位置移动过程的模拟，数值越高移动越快，数值范围（0， 1） */
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }

        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on('end',  event => {
                !event.active && simulation.alphaTarget(0);
                if (!isCenterNode(event.subject)) {
                    event.subject.fx = null;
                    event.subject.fy = null;
                }
              });
    }
    /* 
    显示或隐藏节点，隐藏规则
    1.隐藏特定类型的节点以及关系
    2.如果被隐藏的节点还存在别的关系，不隐藏该节点
    3.脱离了中心节点的线和关系全部隐藏
    4.中心节点不可以过滤掉
    */
    function changeStatus(index) {
        const data = dataSet;
        const temp = status;
        temp[index] = !temp[index];
        setStatus([...temp]);
        if (!dataSet) {
            return;
        }
        const needFilter = [];
        if (temp[0]) {
            needFilter.push('违法');
        }
        if (temp[1]) {
            needFilter.push('事故');
        }
        if (temp[2]) {
            needFilter.push('警情');
        }
        if (temp[3]) {
            needFilter.push('车主');
        }
        if (temp[4]) {
            needFilter.push('车企');
        }
        const tempFilterNodes = [];
        const tempFilterLinks = [];
        data.rel.push(...filterLinks);
        /* 过滤掉线条 */
        data.rel = data.rel.filter((item, index) => {
            const flag = needFilter.includes(item.type);
            if (flag) {
                tempFilterLinks.push(item);
            }
            return !flag;
        });
        data.node.push(...filterNodes);
        /* 过滤掉节点 */
        data.node = data.node.filter(item => {
            if (item.id === centerNode.id) {
                return true;
            }
            const temp = whetherDeleteNode(needFilter, item);
            if (temp) {
                tempFilterNodes.push(item);
            }
            return !temp;
        });
        /* 隐藏脱离中心节点的节点和关系 */
        if (centerNode) {
            const nodesWithCenter = [];
            const linksWithCenter = [];
            findNodesAndLinksWithCenter(centerNode.id, nodesWithCenter, linksWithCenter);
            data.node = data.node.filter(item => {
                if (item.id === centerNode.id) {
                    return true;
                }
                const flag = nodesWithCenter.filter(i => i.id === item.id).length > 0;
                if (!flag) {
                    tempFilterNodes.push(item);
                }
                return flag;
            });
            data.rel = data.rel.filter(item => {
                const flag = linksWithCenter.filter(i => i.target.id === item.target.id && i.source.id === item.source.id).length > 0;
                if (!flag) {
                    tempFilterLinks.push(item);
                }
                return flag;
            });
        }
        setFilterNodes(tempFilterNodes);
        setFilterLinks(tempFilterLinks);
        initGraph(data, true);
    }
    /* 如果被隐藏的节点还存在别的关系，不隐藏该几点 --- 返回是否隐藏标识 */
    function whetherDeleteNode(needFilter, currentItem) {
        const flag = needFilter.includes(currentItem.nodeType);
        if (!flag) {
            return false;
        }
        const temp = dataSet.rel.filter(item => {
            if (item.source.id === currentItem.id || item.target.id === currentItem.id) {
                return true;
            }
            return false
        });
        if (temp.length > 0) {
            return false;
        }
        return true;
    }
    /* 查找出和中心节点有关联的关系和节点 */
    function findNodesAndLinksWithCenter(nodeId, nodes = [], links = []) {
        const tempLinks = dataSet.rel.filter(item => {
            return item.source.id === nodeId || item.target.id === nodeId;
        });
        if (tempLinks && tempLinks.length > 0) {
            tempLinks.forEach(link => {
                const tempNodeId = link.source.id === nodeId ? link.target.id : link.source.id;
                const linkHasExisted = links.filter(i => i.source.id === link.source.id && i.target.id === link.target.id).length > 0;
                if (!linkHasExisted) {
                    links.push(link);
                }
                const hasExisted = nodes.filter(i => i.id === tempNodeId).length > 0;
                if (!hasExisted) {
                    nodes.push(link.source.id === nodeId ? link.target : link.source);
                    findNodesAndLinksWithCenter(tempNodeId, nodes, links)
                }
            })
        }

        /* 找到中心节点id、找关系【多】，找关系中的另一个id,再找关系【多】---递归 */
    }

    /* 是否可以使用 */
    function cannotUse(val) {
        if (!dataSet) {
            return false;
        } else {
            const temp2 = (dataSet.rel || []).filter(item => {
                return item.type === val
            });
            if (temp2.length > 0) {
                return false;
            }
            return true;
        }
    }


    function angel(start, end) {
        var diff_x = end.x - start.x,
            diff_y = end.y - start.y;
        //返回角度,不是弧度
        return 360*Math.atan(diff_y/diff_x)/(2*Math.PI);
    }


    return (
            <div className={`${prefix}`} style={{ height: '100%'}} ref={vehicleMap}>
                <span className={`${prefix}-title`}>车辆关系图谱</span>
                <div className={`${prefix}-btns`}>
                    <MapBtn cannotUse={cannotUseInfo['违法']} name="违法" color="#FF3B3B" disabled={status[0]} onClick={() => changeStatus(0)} />
                    <MapBtn cannotUse={cannotUseInfo['事故']} name="事故" color="#FF8800" disabled={status[1]} onClick={() => changeStatus(1)} />
                    <MapBtn cannotUse={cannotUseInfo['警情']} name="警情" color="#FFCC00" disabled={status[2]} onClick={() => changeStatus(2)} />
                    <MapBtn cannotUse={cannotUseInfo['车主']} name="车主" color="#06C270" disabled={status[3]} onClick={() => changeStatus(3)} />
                    <MapBtn cannotUse={cannotUseInfo['车企']} name="车企" color="#00E5F1" disabled={status[4]} onClick={() => changeStatus(4)} />
                </div>
                <div id="fd"></div>
                {
                    isActive ? <div className={`${prefix}-detail`} style={{background: nodeColor[nodeInfo.title]}}>
                        <div className={`${prefix}-detail-top`} style={{background: nodeColor[nodeInfo.title]}}></div>
                        <div className={`${prefix}-detail-bottom`} style={{background: nodeColor[nodeInfo.title]}}></div>
                        <div className={`${prefix}-detail-title`}>{nodeInfo.title}</div>
                        <div className={`${prefix}-detail-content`}>
                            {
                                nodeInfo && nodeInfo.detail && nodeInfo.detail.map((item,idx) => {
                                    const reg = new RegExp("[\\u4E00-\\u9FFF]+","g"); /* 校验是否包含汉字 */
                                    const flag = reg.test(item.value);
                                    return <>
                                        <span>{item.key}：</span>
                                        <span style={{
                                            fontFamily:  !flag ? 'Montserrat' : 'PingFangSC',
                                            fontWeight: !flag ? 400 : 600
                                        }}>{item.value}</span>
                                    </>
                                })
                            }
                        </div>
                    </div> : <></>
                }
            </div>
    )
}
