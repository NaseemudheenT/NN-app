import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
const {useRecords}=vi.hoisted(()=>({useRecords:vi.fn()}));
vi.mock("@/lib/nn/records",()=>({useRecords}));
vi.mock("@/components/nn/NNAppSurface",()=>({NNAppSurface:()=> <div>Vault records</div>}));
const {NNVaultWorkspace}=await import("./NNVaultWorkspace");
const app={id:"learning-vault",name:"Learning Vault"} as never;
const state=(items:object[])=>({items,loading:false,empty:!items.length,stale:false,fault:null});
afterEach(cleanup);beforeEach(()=>useRecords.mockReturnValue(state([])));
describe("NN Learning Vault",()=>{
 it("shows honest empty states and record management",()=>{render(<NNVaultWorkspace app={app} sections={[] as never}/>);expect(screen.getByRole("heading",{name:/Learning/})).toBeInTheDocument();expect(screen.getByText("Your library is waiting.")).toBeInTheDocument();expect(screen.getByText("Vault records")).toBeInTheDocument()});
 it("reveals and hides a flashcard answer",()=>{useRecords.mockImplementation((c:string)=>c==="vault_cards"?state([{id:"c1",title:"What is an API?",detail:"A defined interface for software communication."}]):state([{id:"b1",title:"Clean Code",kind:"book",status:"reading"}]));render(<NNVaultWorkspace app={app} sections={[] as never}/>);expect(screen.getByText("Clean Code")).toBeInTheDocument();fireEvent.click(screen.getByRole("button",{name:"Reveal answer"}));expect(screen.getByText("A defined interface for software communication.")).toBeInTheDocument();fireEvent.click(screen.getByRole("button",{name:"Hide answer"}));expect(screen.getByText("What is an API?")).toBeInTheDocument()});
});
