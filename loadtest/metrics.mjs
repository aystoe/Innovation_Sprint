export function summarize(samples){
 const sorted=samples.map(x=>x.ms).sort((a,b)=>a-b),q=p=>sorted.length?sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)]:null
 return {requests:samples.length,errors:samples.filter(x=>!x.ok&&!x.expected).length,expectedRejections:samples.filter(x=>x.expected).length,errorRate:samples.length?samples.filter(x=>!x.ok&&!x.expected).length/samples.length:0,p50:q(.5),p95:q(.95),p99:q(.99)}
}
export function stages(elapsed,scale=1){const t=elapsed/1000/scale;return t<120?Math.max(1,Math.floor(t/120*50)):t<300?50+Math.floor((t-120)/180*150):t<1200?200:t<1260?Math.max(0,200-Math.ceil((t-1200)/60*200)):0}
