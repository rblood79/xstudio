import{r as a,j as i,P as u,N as c,an as m,ao as x,ap as f}from"./index-DzDNpkQF.js";import{E as y}from"./eye-off-B4fzkfUf.js";const h={desktop:{name:"desktop",minWidth:1280,maxWidth:void 0,label:"Desktop",icon:"Monitor"},tablet:{name:"tablet",minWidth:768,maxWidth:1279,label:"Tablet",icon:"Tablet"},mobile:{name:"mobile",minWidth:0,maxWidth:767,label:"Mobile",icon:"Smartphone"}},g=["desktop","tablet","mobile"];function k({breakpoint:n,size:e=16}){switch(n){case"desktop":return i.jsx(f,{size:e});case"tablet":return i.jsx(x,{size:e});case"mobile":return i.jsx(m,{size:e});default:return null}}const E=a.memo(function({visibility:e={},onChange:t,title:d="Responsive Visibility",disabled:l=!1}){const b=a.useCallback(s=>{const r=e[s]??!0;t({...e,[s]:!r})},[e,t]),p=a.useCallback(()=>{t({desktop:!0,tablet:!0,mobile:!0})},[t]),v=a.useCallback(()=>{t({desktop:!1,tablet:!1,mobile:!1})},[t]);return i.jsxs(u,{title:d,icon:c,children:[i.jsxs("div",{className:"responsive-visibility-editor",children:[i.jsx("div",{className:"responsive-visibility-buttons",children:g.map(s=>{const r=e[s]??!0,o=h[s];return i.jsxs("button",{type:"button",className:`responsive-visibility-btn ${r?"visible":"hidden"}`,onClick:()=>b(s),disabled:l,title:`${o.label}: ${r?"Visible":"Hidden"} (${o.minWidth}px${o.maxWidth?`-${o.maxWidth}px`:"+"})`,"aria-pressed":r,children:[i.jsx(k,{breakpoint:s,size:14}),i.jsx("span",{className:"responsive-visibility-label",children:o.label}),r?i.jsx(c,{size:12}):i.jsx(y,{size:12})]},s)})}),i.jsxs("div",{className:"responsive-visibility-actions",children:[i.jsx("button",{type:"button",className:"responsive-visibility-action",onClick:p,disabled:l,title:"Show on all breakpoints",children:"Show All"}),i.jsx("button",{type:"button",className:"responsive-visibility-action",onClick:v,disabled:l,title:"Hide on all breakpoints",children:"Hide All"})]}),i.jsx("p",{className:"responsive-visibility-help",children:"Control element visibility at different screen sizes"})]}),i.jsx("style",{children:`
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
          background: var(--surface-container);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: var(--text-xs);
        }

        .responsive-visibility-btn:hover:not(:disabled) {
          background: var(--surface-container-high);
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
          background: var(--surface-container);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: var(--text-2xs);
          transition: all 0.2s ease;
        }

        .responsive-visibility-action:hover:not(:disabled) {
          background: var(--surface-container-high);
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
      `})]})});export{E as ResponsiveVisibilityEditor,E as default};
