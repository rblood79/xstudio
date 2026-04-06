import{r,j as i}from"./events.registry-D5sEkxJU.js";import{S as u,aj as c,$ as x,R as d,al as y,am as f,an as h,ao as g}from"./main-BNeNIEw7.js";const k={desktop:{name:"desktop",minWidth:1280,maxWidth:void 0,label:"Desktop",icon:"Monitor"},tablet:{name:"tablet",minWidth:768,maxWidth:1279,label:"Tablet",icon:"Tablet"},mobile:{name:"mobile",minWidth:0,maxWidth:767,label:"Mobile",icon:"Smartphone"}},j=["desktop","tablet","mobile"];function E({breakpoint:n,size:s=16}){switch(n){case"desktop":return i.jsx(g,{size:s});case"tablet":return i.jsx(h,{size:s});case"mobile":return i.jsx(f,{size:s});default:return null}}const S=r.memo(function({visibility:s={},onChange:t,title:b="Responsive Visibility",disabled:l=!1}){const v=r.useCallback(e=>{const a=s[e]??!0;t({...s,[e]:!a})},[s,t]),p=r.useCallback(()=>{t({desktop:!0,tablet:!0,mobile:!0})},[t]),m=r.useCallback(()=>{t({desktop:!1,tablet:!1,mobile:!1})},[t]);return i.jsxs(u,{title:b,icon:c,children:[i.jsxs("div",{className:"responsive-visibility-editor",children:[i.jsx("div",{className:"responsive-visibility-buttons",children:j.map(e=>{const a=s[e]??!0,o=k[e];return i.jsxs("button",{type:"button",className:`responsive-visibility-btn ${a?"visible":"hidden"}`,onClick:()=>v(e),disabled:l,title:`${o.label}: ${a?"Visible":"Hidden"} (${o.minWidth}px${o.maxWidth?`-${o.maxWidth}px`:"+"})`,"aria-pressed":a,children:[i.jsx(E,{breakpoint:e,size:x.size}),i.jsx("span",{className:"responsive-visibility-label",children:o.label}),a?i.jsx(c,{size:d.size}):i.jsx(y,{size:d.size})]},e)})}),i.jsxs("div",{className:"responsive-visibility-actions",children:[i.jsx("button",{type:"button",className:"responsive-visibility-action",onClick:p,disabled:l,title:"Show on all breakpoints",children:"Show All"}),i.jsx("button",{type:"button",className:"responsive-visibility-action",onClick:m,disabled:l,title:"Hide on all breakpoints",children:"Hide All"})]}),i.jsx("p",{className:"responsive-visibility-help",children:"Control element visibility at different screen sizes"})]}),i.jsx("style",{children:`
        .responsive-visibility-editor {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .responsive-visibility-buttons {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .responsive-visibility-btn {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--bg-raised);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: var(--text-xs);
        }

        .responsive-visibility-btn:hover:not(:disabled) {
          background: var(--bg-overlay);
        }

        .responsive-visibility-btn.visible {
          border-color: var(--color-success-500, #22c55e);
          background: var(--color-success-50, #f0fdf4);
        }

        .responsive-visibility-btn.hidden {
          border-color: var(--color-error-500, #ef4444);
          background: var(--color-error-50, #fef2f2);
          opacity: 0.7;
        }

        .responsive-visibility-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .responsive-visibility-label {
          flex: 1;
          text-align: left;
        }

        .responsive-visibility-actions {
          display: flex;
          gap: var(--spacing-sm);
        }

        .responsive-visibility-action {
          flex: 1;
          padding: var(--spacing-xs) var(--spacing-sm);
          background: var(--bg-raised);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: var(--text-2xs);
          transition: all 0.2s ease;
        }

        .responsive-visibility-action:hover:not(:disabled) {
          background: var(--bg-overlay);
        }

        .responsive-visibility-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .responsive-visibility-help {
          font-size: var(--text-2xs);
          color: var(--text-secondary);
          margin: 0;
        }
      `})]})});export{S as ResponsiveVisibilityEditor,S as default};
