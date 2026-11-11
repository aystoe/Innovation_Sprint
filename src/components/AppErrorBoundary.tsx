import {Component} from 'react'
import type {ErrorInfo,ReactNode} from 'react'
export class AppErrorBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false}
 static getDerivedStateFromError(){return {failed:true}}
 componentDidCatch(error:Error,info:ErrorInfo){console.error('App rendering failed:',error,info.componentStack)}
 render(){if(this.state.failed)return <div className="phone"><main className="page"><h1>Could not display this screen</h1><p role="alert">Please try again. Unsaved changes may need to be entered again.</p><button className="primary" onClick={()=>this.setState({failed:false})}>Try again</button></main></div>;return this.props.children}
}
