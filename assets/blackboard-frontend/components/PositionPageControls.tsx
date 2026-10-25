import { Button } from './primitives'

interface PositionPageControlsProps {page:number;pages:number;total:number;count:number;pageSize:number;loaded:boolean;onPage:(page:number)=>void}
/** Stateless controls, shared by live account pagination and isolated responsive QA. */
export function PositionPageControls({page,pages,total,count,pageSize,loaded,onPage}:PositionPageControlsProps){
 if(total<=pageSize)return null
 const start=(page-1)*pageSize+1,end=start+count-1
 return <div className="tr-pager">
  <span role="status">{loaded?`Showing ${start}–${end} of ${total}`:'Loading positions…'} · sort and chart lines use this page</span>
  <nav className="tr-pager-nav" aria-label="Open positions pages">
   <Button size="sm" disabled={!loaded||page<=1} onClick={()=>onPage(page-1)}>‹ Previous</Button>
   <span className="ui-num">{page} / {pages}</span>
   <Button size="sm" disabled={!loaded||page>=pages} onClick={()=>onPage(page+1)}>Next ›</Button>
  </nav>
 </div>
}
