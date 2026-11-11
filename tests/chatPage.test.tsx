import {StrictMode,useState} from 'react'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
const api=vi.hoisted(()=>({open:vi.fn(),page:vi.fn(),send:vi.fn(),stop:vi.fn(),profile:vi.fn()}))
vi.mock('../src/services/chatRepository',()=>({chatTransport:{open:api.open,page:api.page,send:api.send,subscribe:()=>api.stop}}))
vi.mock('../src/services/profileRepository',()=>({loadProfile:api.profile}))
import {ChatProvider} from '../src/context/ChatProvider'
import {CommunityContext} from '../src/context/CommunityContext'
import type {CommunityStore} from '../src/context/CommunityContext'
import {ChatPage} from '../src/pages/ChatPage'
function Screen(){const [draft,setDraft]=useState('');return <ChatPage personId="bob" draft={draft} onDraftChange={setDraft} onBack={()=>{}} onProfile={()=>{}}/>}
function app(id='alice'){return <StrictMode><CommunityContext.Provider value={{userId:id,snapshot:{profile:{name:'Alice'}}} as CommunityStore}><ChatProvider key={id} userId={id}><Screen/></ChatProvider></CommunityContext.Provider></StrictMode>}
beforeEach(()=>{vi.clearAllMocks();api.open.mockResolvedValue('room');api.page.mockResolvedValue([]);api.profile.mockResolvedValue({id:'bob',name:'Bob',photo:''});api.send.mockRejectedValue(new Error('offline'))})
afterEach(cleanup)
it('three suggestions only populate draft; explicit send shows failure and reuses retry ID',async()=>{
 render(app());await screen.findByText('Say hello to Bob');expect(screen.getAllByText('Use message ↗')).toHaveLength(3)
 expect(api.send).not.toHaveBeenCalled();fireEvent.click(screen.getByText('Coffee tomorrow'))
 expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toContain('coffee tomorrow');expect(api.send).not.toHaveBeenCalled()
 fireEvent.click(screen.getByLabelText('Send message'));await screen.findByText('Failed · not confirmed')
 const id=api.send.mock.calls[0][1];fireEvent.click(screen.getByRole('button',{name:'Retry'}));await waitFor(()=>expect(api.send).toHaveBeenCalledTimes(2));expect(api.send.mock.calls[1][1]).toBe(id)
})
it('account unmount clears optimistic messages and removes channel',async()=>{
 const view=render(app());await screen.findByText('Say hello to Bob');fireEvent.change(screen.getByLabelText('Message'),{target:{value:'private pending text'}});fireEvent.click(screen.getByLabelText('Send message'));await screen.findByText('private pending text')
 view.rerender(app('carol'));await screen.findByText('Say hello to Bob');expect(screen.queryByText('private pending text')).toBeNull();expect(api.stop).toHaveBeenCalled()
})
