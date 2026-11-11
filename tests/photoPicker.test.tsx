import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
const mock=vi.hoisted(()=>({prepare:vi.fn()}))
vi.mock('../src/services/photos',()=>({preparePhoto:mock.prepare}))
import {PhotoPicker} from '../src/components/PhotoPicker'
afterEach(()=>{cleanup();vi.clearAllMocks()})
it('uses a button with a fully hidden file input and returns the selected image',async()=>{
 mock.prepare.mockResolvedValue('data:image/jpeg;base64,anBlZw==');const change=vi.fn(),busy=vi.fn()
 const view=render(<PhotoPicker photos={[]} onChange={change} onBusyChange={busy} max={1} label="Add event image"/>)
 const input=view.container.querySelector('input[type="file"]') as HTMLInputElement
 expect(input.hidden).toBe(true);expect(input.style.display).toBe('none');expect(input.tabIndex).toBe(-1)
 const open=vi.spyOn(input,'click');fireEvent.click(screen.getByRole('button',{name:'Add event image'}));expect(open).toHaveBeenCalledOnce()
 fireEvent.change(input,{target:{files:[new File(['x'],'photo.jpg',{type:'image/jpeg'})]}})
 await waitFor(()=>expect(change).toHaveBeenCalledWith(['data:image/jpeg;base64,anBlZw==']))
 expect(busy).toHaveBeenLastCalledWith(false)
})
it('processing failure preserves the previous image and reports an error',async()=>{
 mock.prepare.mockRejectedValue(new Error('Unsupported photo'));const change=vi.fn()
 const view=render(<PhotoPicker photos={['old-photo']} onChange={change} onBusyChange={()=>{}} max={1}/>)
 fireEvent.change(view.container.querySelector('input')!,{target:{files:[new File(['x'],'photo.jpg',{type:'image/jpeg'})]}})
 await screen.findByText('Unsupported photo');expect(change).toHaveBeenCalledWith(['old-photo'])
})
