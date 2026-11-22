import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {act,cleanup,fireEvent,render,screen} from "@testing-library/react";
const {useRecords,useRecordWriter}=vi.hoisted(()=>({useRecords:vi.fn(),useRecordWriter:vi.fn()}));
vi.mock("@/lib/nn/records",()=>({useRecords,useRecordWriter}));
vi.mock("@/components/nn/NNAppSurface",()=>({NNAppSurface:()=> <div>Studio records</div>}));
const {NNStudioWorkspace}=await import("./NNStudioWorkspace");
const app={id:"creator-studio",name:"Creator Studio"} as never;
const state=(items:object[])=>({items,loading:false,empty:!items.length,stale:false,fault:null});
afterEach(cleanup);beforeEach(()=>{useRecords.mockReturnValue(state([]));useRecordWriter.mockReturnValue({ready:true,update:vi.fn()})});
describe("NN Creator Studio",()=>{
 it("shows a real empty production pipeline",()=>{render(<NNStudioWorkspace app={app} sections={[] as never}/>);expect(screen.getByRole("heading",{name:/Creator/})).toBeInTheDocument();expect(screen.getByText("Start with an idea.")).toBeInTheDocument();expect(screen.getByText("Studio records")).toBeInTheDocument()});
 it("moves a content item to the next production stage",async()=>{const update=vi.fn().mockResolvedValue(undefined);useRecordWriter.mockReturnValue({ready:true,update});useRecords.mockReturnValue(state([{id:"v1",title:"Launch reel",status:"idea",detail:"First concept"}]));render(<NNStudioWorkspace app={app} sections={[] as never}/>);await act(async()=>{fireEvent.click(screen.getByRole("button",{name:"Move to making"}));});expect(update).toHaveBeenCalledWith("creator_content","v1",{status:"making"})});
});
