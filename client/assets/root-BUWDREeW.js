import{u as y,d as S,r as i,j as t,O as f}from"./index-BHE-KyRT.js";import{s as c}from"./supabase.client-C2dMp-kt.js";import{h as x,j,_ as w,M as g,L as b,S as k}from"./components-DN1P8sXB.js";/**
 * @remix-run/react v2.16.0
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */let d="positions";function M({getKey:e,...n}){let{isSpaMode:a}=x(),s=y(),l=S();j({getKey:e,storageKey:d});let h=i.useMemo(()=>{if(!e)return null;let r=e(s,l);return r!==s.key?r:null},[]);if(a)return null;let p=((r,m)=>{if(!window.history.state||!window.history.state.key){let o=Math.random().toString(32).slice(2);window.history.replaceState({key:o},"")}try{let u=JSON.parse(sessionStorage.getItem(r)||"{}")[m||window.history.state.key];typeof u=="number"&&window.scrollTo(0,u)}catch(o){console.error(o),sessionStorage.removeItem(r)}}).toString();return i.createElement("script",w({},n,{suppressHydrationWarning:!0,dangerouslySetInnerHTML:{__html:`(${p})(${JSON.stringify(d)}, ${JSON.stringify(h)})`}}))}const _=()=>[{rel:"stylesheet",as:"style",href:"https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css",crossOrigin:"anonymous"}];function E({children:e}){return t.jsxs("html",{lang:"en",children:[t.jsxs("head",{children:[t.jsx("meta",{charSet:"utf-8"}),t.jsx("meta",{name:"viewport",content:"width=device-width, initial-scale=1"}),t.jsx(g,{}),t.jsx(b,{})]}),t.jsxs("body",{children:[e,t.jsx(M,{}),t.jsx(k,{})]})]})}function R(){const[e,n]=i.useState(null);return i.useEffect(()=>{c.auth.getSession().then(({data:{session:s}})=>{n(s)});const{data:{subscription:a}}=c.auth.onAuthStateChange((s,l)=>{n(l)});return()=>a.unsubscribe()},[]),t.jsx(f,{context:{session:e}})}export{E as Layout,R as default,_ as links};
