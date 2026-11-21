import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
const {useRecords,useRecordWriter}=vi.hoisted(()=>({useRecords:vi.fn(),useRecordWriter:vi.fn()}));
vi.mock("@/lib/nn/records",()=>({useRecords,useRecordWriter}));
vi.mock("@/components/nn/NNAppSurface",()=>({NNAppSurface:()=> <div>Challenge records</div>}));
const {NNLogicWorkspace}=await import("./NNLogicWorkspace");
const app={id:"logic-lab",name:"Logic Lab"} as never;
const state=(items:object[])=>({items,loading:false,empty:!items.length,stale:false,fault:null});
afterEach(cleanup);beforeEach(()=>{useRecords.mockReturnValue(state([]));useRecordWriter.mockReturnValue({ready:true,update:vi.fn()})});
describe("NN Logic Lab",()=>{
 it("shows the practice queue and editable records",()=>{render(<NNLogicWorkspace app={app} sections={[] as never}/>);expect(screen.getByRole("heading",{name:/Logic/})).toBeInTheDocument();expect(screen.getByText("Your challenge board is clear.")).toBeInTheDocument();expect(screen.getByText("Challenge records")).toBeInTheDocument()});
 it("marks a challenge solved through the record writer",()=>{const update=vi.fn().mockResolvedValue(undefined);useRecordWriter.mockReturnValue({ready:true,update});useRecords.mockReturnValue(state([{id:"c1",title:"Two-sum",status:"to do",detail:"Find two values with a target sum."}]));render(<NNLogicWorkspace app={app} sections={[] as never}/>);fireEvent.click(screen.getByRole("button",{name:"Mark solved"}));expect(update).toHaveBeenCalledWith("logic_challenges","c1",{status:"solved"})});
});
