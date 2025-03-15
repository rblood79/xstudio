import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable, json } from "@remix-run/node";
import { RemixServer, Outlet, Meta, Links, ScrollRestoration, Scripts, useNavigate, useParams, useLoaderData, useOutletContext } from "@remix-run/react";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import React, { useState, useEffect } from "react";
import { RiFunctionFill, RiFileAddLine, RiAddBoxLine, RiDropdownList, RiAttachment2, RiImageAddLine, RiDatabase2Line, RiTeamLine, RiSettingsLine, RiMenuLine, RiSmartphoneFill, RiComputerFill, RiEye2Line, RiPlayFill } from "@remixicon/react";
const ABORT_DELAY = 5e3;
function handleRequest(request, responseStatusCode, responseHeaders, remixContext, loadContext) {
  return isbot(request.headers.get("user-agent") || "") ? handleBotRequest(
    request,
    responseStatusCode,
    responseHeaders,
    remixContext
  ) : handleBrowserRequest(
    request,
    responseStatusCode,
    responseHeaders,
    remixContext
  );
}
function handleBotRequest(request, responseStatusCode, responseHeaders, remixContext) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(
        RemixServer,
        {
          context: remixContext,
          url: request.url,
          abortDelay: ABORT_DELAY
        }
      ),
      {
        onAllReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
function handleBrowserRequest(request, responseStatusCode, responseHeaders, remixContext) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(
        RemixServer,
        {
          context: remixContext,
          url: request.url,
          abortDelay: ABORT_DELAY
        }
      ),
      {
        onShellReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest
}, Symbol.toStringTag, { value: "Module" }));
const supabase = void 0;
const links = () => [
  {
    rel: "stylesheet",
    as: "style",
    href: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css",
    crossOrigin: "anonymous"
  }
];
function Layout({ children }) {
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ jsx("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
      /* @__PURE__ */ jsx(Meta, {}),
      /* @__PURE__ */ jsx(Links, {})
    ] }),
    /* @__PURE__ */ jsxs("body", { children: [
      children,
      /* @__PURE__ */ jsx(ScrollRestoration, {}),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
function App() {
  const [session, setSession] = useState(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: session2 } }) => {
      setSession(session2);
    });
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session2) => {
      setSession(session2);
    });
    return () => subscription.unsubscribe();
  }, []);
  return /* @__PURE__ */ jsx(Outlet, { context: { session } });
}
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Layout,
  default: App,
  links
}, Symbol.toStringTag, { value: "Module" }));
function Builder({ projectId }) {
  useNavigate();
  const [pages, setPages] = useState([]);
  const [elements, setElements] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState(null);
  const [selectedElementId, setSelectedElementId] = useState(null);
  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase.from("pages").select("*").eq("project_id", projectId);
      if (error) {
        console.error("프로젝트 조회 에러:", error);
      } else {
        setPages(data);
        console.log("프로젝트 조회 결과:", data);
      }
    };
    if (projectId) {
      fetchProjects();
    }
  }, [projectId]);
  useEffect(() => {
    if (!selectedPageId && pages.length > 0) {
      fetchElements(pages[0].id);
    }
  }, [pages]);
  const fetchElements = async (pageId) => {
    setSelectedPageId(pageId);
    setSelectedElementId(null);
    const { data, error } = await supabase.from("elements").select("*").eq("page_id", pageId);
    if (error) {
      console.error("요소 조회 에러:", error);
    } else {
      setElements(data);
      console.log("요소 조회 결과:", data);
    }
  };
  const handleAddDivElement = async () => {
    if (!selectedPageId) {
      alert("먼저 페이지를 선택하세요.");
      return;
    }
    const newElement = {
      page_id: selectedPageId,
      tag: "div",
      props: { style: {} },
      parent_id: selectedElementId ? selectedElementId : null
      // parent_id를 명시적으로 null 처리
    };
    const { data, error } = await supabase.from("elements").insert([newElement]).select();
    if (error) {
      console.error("요소 추가 에러:", error);
    } else if (data) {
      setElements((prev) => [...prev, data[0]]);
      console.log("새 DIV 요소 추가:", data[0]);
    }
  };
  const handleDeleteSelectedElement = async () => {
    if (!selectedElementId) {
      alert("선택된 element가 없습니다.");
      return;
    }
    const { error } = await supabase.from("elements").delete().eq("id", selectedElementId);
    if (error) {
      console.error("요소 삭제 에러:", error);
    } else {
      if (selectedPageId) {
        const { data, error: error2 } = await supabase.from("elements").select("*").eq("page_id", selectedPageId);
        if (error2) {
          console.error("요소 조회 에러:", error2);
        } else {
          setElements(data);
        }
      }
      setSelectedElementId(null);
    }
  };
  const renderElementsList = (parentId = null) => {
    return /* @__PURE__ */ jsx(Fragment, { children: elements.filter((el) => el.parent_id === parentId).map((el) => /* @__PURE__ */ jsxs(
      "div",
      {
        onClick: (e) => {
          e.stopPropagation();
          setSelectedElementId(el.id);
        },
        className: "element",
        style: {
          outline: selectedElementId === el.id ? "1px solid blue" : void 0
        },
        children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("span", { children: el.tag }),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: async () => {
                  const { error } = await supabase.from("elements").delete().eq("id", el.id);
                  if (error) {
                    console.error("요소 삭제 에러:", error);
                  } else {
                    setElements(
                      (prev) => prev.filter((e) => e.id !== el.id)
                    );
                  }
                },
                children: "del"
              }
            )
          ] }),
          renderElementsList(el.id)
        ]
      },
      el.id
    )) });
  };
  useEffect(() => {
    const iframe = document.getElementById("previewFrame");
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: "UPDATE_ELEMENTS", elements }, "*");
    }
  }, [elements]);
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === "ELEMENT_SELECTED") {
        setSelectedElementId(event.data.elementId);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);
  return /* @__PURE__ */ jsx("div", { className: "app", children: /* @__PURE__ */ jsxs("div", { className: "contents", children: [
    /* @__PURE__ */ jsx("main", { children: /* @__PURE__ */ jsx("div", { className: "bg", children: /* @__PURE__ */ jsxs("div", { className: "workspace", children: [
      /* @__PURE__ */ jsx(
        "iframe",
        {
          id: "previewFrame",
          src: projectId ? `/preview/${projectId}?isIframe=true` : "/preview?isIframe=true",
          style: { width: "100%", height: "100%", border: "none" }
        }
      ),
      /* @__PURE__ */ jsx("div", { className: "workspace_overlay" })
    ] }) }) }),
    /* @__PURE__ */ jsxs("aside", { className: "sidebar", children: [
      /* @__PURE__ */ jsxs("div", { className: "sidebar_nav", children: [
        /* @__PURE__ */ jsxs("div", { className: "sidebar_group", children: [
          /* @__PURE__ */ jsx("button", { children: /* @__PURE__ */ jsx(
            RiFunctionFill,
            {
              size: 21,
              color: "#171717",
              className: "ri-function-fill"
            }
          ) }),
          /* @__PURE__ */ jsx("button", { children: /* @__PURE__ */ jsx(
            RiFileAddLine,
            {
              size: 21,
              color: "#171717",
              className: "ri-file-add-line"
            }
          ) }),
          /* @__PURE__ */ jsx("button", { children: /* @__PURE__ */ jsx(
            RiAddBoxLine,
            {
              size: 21,
              color: "#171717",
              className: "ri-add-box-line"
            }
          ) }),
          /* @__PURE__ */ jsx("button", { children: /* @__PURE__ */ jsx(
            RiDropdownList,
            {
              size: 21,
              color: "#171717",
              className: "ri-dropdown-list"
            }
          ) }),
          /* @__PURE__ */ jsx("button", { children: /* @__PURE__ */ jsx(
            RiAttachment2,
            {
              size: 21,
              color: "#171717",
              className: "ri-attachment-2"
            }
          ) }),
          /* @__PURE__ */ jsx("button", { children: /* @__PURE__ */ jsx(
            RiImageAddLine,
            {
              size: 21,
              color: "#171717",
              className: "ri-image-add-line"
            }
          ) }),
          /* @__PURE__ */ jsx("button", { children: /* @__PURE__ */ jsx(
            RiDatabase2Line,
            {
              size: 21,
              color: "#171717",
              className: "ri-database-2-line"
            }
          ) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "sidebar_group", children: [
          /* @__PURE__ */ jsx("button", { children: /* @__PURE__ */ jsx(
            RiTeamLine,
            {
              size: 21,
              color: "#171717",
              className: "ri-team-line"
            }
          ) }),
          /* @__PURE__ */ jsx("button", { children: /* @__PURE__ */ jsx(
            RiSettingsLine,
            {
              size: 21,
              color: "#171717",
              className: "ri-settings-line"
            }
          ) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "sidebar_pages", children: [
        /* @__PURE__ */ jsx("h3", { children: "Pages" }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(
            "button",
            {
              onClick: async () => {
                const title = prompt("Enter page title:");
                const slug = prompt("Enter page slug:");
                if (!title || !slug) {
                  alert("Title and slug are required.");
                  return;
                }
                const newPage = { title, project_id: projectId, slug };
                const { data, error } = await supabase.from("pages").insert([newPage]).select();
                if (error) {
                  console.error("페이지 생성 에러:", error);
                } else {
                  if (data) {
                    setPages((prevPages) => [...prevPages, ...data]);
                  }
                }
              },
              children: "Add"
            }
          ) }),
          /* @__PURE__ */ jsx("div", { className: "elements", children: pages.map((page) => /* @__PURE__ */ jsxs("div", { className: "element", children: [
            /* @__PURE__ */ jsx(
              "span",
              {
                style: { cursor: "pointer" },
                onClick: () => fetchElements(page.id),
                children: page.title
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: async () => {
                  const { error } = await supabase.from("pages").delete().eq("id", page.id);
                  if (error) {
                    console.error("페이지 삭제 에러:", error);
                  } else {
                    setPages(
                      (prevPages) => prevPages.filter((p) => p.id !== page.id)
                    );
                  }
                },
                children: "Delete"
              }
            )
          ] }, page.id)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "sidebar_elements", children: [
        /* @__PURE__ */ jsx("h3", { children: "Elements Node" }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("button", { onClick: handleAddDivElement, children: "add elm" }),
          /* @__PURE__ */ jsx("button", { onClick: handleDeleteSelectedElement, children: "del elm" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "elements", children: renderElementsList() })
      ] })
    ] }),
    /* @__PURE__ */ jsx("aside", { className: "inspector", children: "inspector" }),
    /* @__PURE__ */ jsxs("nav", { className: "header", children: [
      /* @__PURE__ */ jsxs("div", { className: "header_contents header_left", children: [
        /* @__PURE__ */ jsx("button", { children: /* @__PURE__ */ jsx(
          RiMenuLine,
          {
            size: 21,
            color: "#171717",
            className: "button ri-menu-line"
          }
        ) }),
        projectId ? `Project ID: ${projectId}` : "No project ID provided"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "header_contents screen_size", children: [
        /* @__PURE__ */ jsx("button", { children: "1920" }),
        /* @__PURE__ */ jsx("button", { children: /* @__PURE__ */ jsx(
          RiSmartphoneFill,
          {
            size: 21,
            color: "#171717",
            className: "button ri-smartphone-fill"
          }
        ) }),
        /* @__PURE__ */ jsx("button", { children: /* @__PURE__ */ jsx(
          RiComputerFill,
          {
            size: 21,
            color: "#171717",
            className: "button ri-computer-fill"
          }
        ) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "header_contents header_right", children: [
        /* @__PURE__ */ jsx("button", { children: /* @__PURE__ */ jsx(
          RiEye2Line,
          {
            size: 21,
            color: "#171717",
            className: "button ri-eye-2-line"
          }
        ) }),
        /* @__PURE__ */ jsx("button", { children: /* @__PURE__ */ jsx(
          RiPlayFill,
          {
            size: 21,
            color: "#171717",
            className: "button ri-play-fill"
          }
        ) }),
        /* @__PURE__ */ jsx("button", { children: "Publish" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("footer", { className: "footer", children: "footer" })
  ] }) });
}
function BuilderdRoute$1() {
  const { projectId } = useParams();
  return /* @__PURE__ */ jsx(Builder, { projectId });
}
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: BuilderdRoute$1
}, Symbol.toStringTag, { value: "Module" }));
function Preview({ projectId }) {
  const [elements, setElements] = useState([]);
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === "UPDATE_ELEMENTS") {
        setElements(event.data.elements);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);
  const renderElement = (el) => {
    const children = elements.filter((child) => child.parent_id === el.id);
    const newProps = {
      ...el.props,
      key: el.id,
      onClick: (e) => {
        e.stopPropagation();
        window.parent.postMessage({ type: "ELEMENT_SELECTED", elementId: el.id }, "*");
      }
    };
    return React.createElement(
      el.tag,
      newProps,
      /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("span", { children: [
          el.tag,
          " - ",
          el.id
        ] }),
        children.map((child) => renderElement(child))
      ] })
    );
  };
  const renderElementsTree = () => {
    return elements.filter((el) => !el.parent_id).map((el) => renderElement(el));
  };
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("div", { children: projectId ? `Project ID: ${projectId}` : "No project ID provided" }),
    /* @__PURE__ */ jsx("div", { className: "workspace", children: elements.length === 0 ? "No elements available" : renderElementsTree() })
  ] });
}
const loader = async ({ params }) => {
  return json({ projectId: params.projectId });
};
function PreviewRoute$1() {
  const { projectId } = useLoaderData();
  return /* @__PURE__ */ jsx(Preview, { projectId });
}
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: PreviewRoute$1,
  loader
}, Symbol.toStringTag, { value: "Module" }));
function Project() {
  return /* @__PURE__ */ jsx("div", {});
}
function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [newProjectName, setNewProjectName] = useState("");
  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase.from("projects").select("*");
      if (error) {
        console.error("프로젝트 조회 에러:", error);
      } else {
        setProjects(data);
      }
    };
    fetchProjects();
  }, []);
  const handleAddProject = async (e) => {
    e.preventDefault();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !(sessionData == null ? void 0 : sessionData.session)) {
      console.error("세션 조회 에러:", sessionError);
      return;
    }
    const userId = sessionData.session.user.id;
    if (!newProjectName.trim()) {
      console.error("프로젝트 이름이 비어 있습니다.");
      return;
    }
    const { data: projectData, error: projectError } = await supabase.from("projects").insert([{ name: newProjectName, created_by: userId }]).select();
    if (projectError) {
      console.error("프로젝트 추가 에러:", projectError);
      return;
    }
    const newProject = projectData[0];
    const projectId = newProject.id;
    const { error: pageError } = await supabase.from("pages").insert([{ project_id: projectId, title: "Home", slug: "home" }]);
    if (pageError) {
      console.error("기본 페이지 생성 에러:", pageError);
    }
    const { error: puError } = await supabase.from("project_users").insert([{ project_id: projectId, user_id: userId, role: "owner" }]);
    if (puError) {
      console.error("프로젝트 사용자 추가 에러:", puError);
    }
    setProjects((prev) => [...prev, newProject]);
    setNewProjectName("");
  };
  const handleDeleteProject = async (id) => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      console.error("프로젝트 삭제 에러:", error);
    } else {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };
  const handleProject = async (project) => {
    const url = `/builder/${project.id}`;
    navigate(url);
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };
  return /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("button", { onClick: handleLogout, children: "로그아웃" }),
    /* @__PURE__ */ jsxs("main", { children: [
      /* @__PURE__ */ jsx("h2", { children: "Projects List" }),
      /* @__PURE__ */ jsxs("form", { onSubmit: handleAddProject, children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            value: newProjectName,
            onChange: (e) => setNewProjectName(e.target.value),
            placeholder: "프로젝트 이름 입력",
            required: true
          }
        ),
        /* @__PURE__ */ jsx("button", { type: "submit", children: "프로젝트 추가" })
      ] }),
      /* @__PURE__ */ jsx("ul", { children: projects.map((project) => /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsx("button", { onClick: () => handleProject(project), children: project.name }),
        " - ",
        project.updated_at,
        /* @__PURE__ */ jsx("button", { onClick: () => handleDeleteProject(project.id), children: "삭제" })
      ] }, project.id)) })
    ] }),
    /* @__PURE__ */ jsx("aside", { children: "left-sidebar" }),
    /* @__PURE__ */ jsx("nav", { children: "header" }),
    /* @__PURE__ */ jsx("footer", { children: "footer" }),
    /* @__PURE__ */ jsx(Project, {})
  ] }) });
}
function DashboardRoute() {
  return /* @__PURE__ */ jsx(Dashboard, {});
}
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: DashboardRoute
}, Symbol.toStringTag, { value: "Module" }));
function BuilderdRoute() {
  const { projectId } = useParams();
  return /* @__PURE__ */ jsx(Builder, { projectId });
}
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: BuilderdRoute
}, Symbol.toStringTag, { value: "Module" }));
function PreviewRoute() {
  const { projectId } = useParams();
  return /* @__PURE__ */ jsx(Preview, { projectId });
}
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: PreviewRoute
}, Symbol.toStringTag, { value: "Module" }));
const meta = () => {
  return [
    { title: "xstudio" },
    { name: "description", content: "Welcome to XSTUDIO" }
  ];
};
function Index() {
  const { session } = useOutletContext();
  const navigate = useNavigate();
  useEffect(() => {
    if (session) {
      navigate("/dashboard");
    }
  }, [session, navigate]);
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("p", { children: "new XSTUDIO App." }),
    session ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("p", { children: "Redirecting to dashboard..." }) }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("p", { children: "You are not logged in." }),
      /* @__PURE__ */ jsx("button", { onClick: () => navigate("/signin"), children: "로그인" }),
      /* @__PURE__ */ jsx("button", { onClick: () => navigate("/signup"), children: "가입" })
    ] })
  ] });
}
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Index,
  meta
}, Symbol.toStringTag, { value: "Module" }));
function Signin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error: error2 } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error2) {
      setError(error2.message);
    } else {
      navigate("/");
    }
  };
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("h2", { children: "SignIn" }),
    /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, children: [
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "email",
          placeholder: "Email",
          value: email,
          onChange: (e) => setEmail(e.target.value),
          required: true
        }
      ),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "password",
          placeholder: "Password",
          value: password,
          onChange: (e) => setPassword(e.target.value),
          required: true
        }
      ),
      error && /* @__PURE__ */ jsx("p", { style: { color: "red" }, children: error }),
      /* @__PURE__ */ jsx("button", { type: "submit", children: "Signin" })
    ] })
  ] });
}
function SigninRoute() {
  return /* @__PURE__ */ jsx(Signin, {});
}
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: SigninRoute
}, Symbol.toStringTag, { value: "Module" }));
function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      alert("Error signing up");
    } else {
      navigate("/");
    }
  };
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("h2", { children: "Signup" }),
    /* @__PURE__ */ jsx(
      "input",
      {
        type: "email",
        placeholder: "Email",
        value: email,
        onChange: (e) => setEmail(e.target.value)
      }
    ),
    /* @__PURE__ */ jsx(
      "input",
      {
        type: "password",
        placeholder: "Password",
        value: password,
        onChange: (e) => setPassword(e.target.value)
      }
    ),
    /* @__PURE__ */ jsx("button", { onClick: handleSignup, children: "Signup" })
  ] });
}
function SignupRoute() {
  return /* @__PURE__ */ jsx(Signup, {});
}
const route8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: SignupRoute
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-BLyv7Awv.js", "imports": ["/assets/index-BHE-KyRT.js", "/assets/components-DN1P8sXB.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/root-BUWDREeW.js", "imports": ["/assets/index-BHE-KyRT.js", "/assets/components-DN1P8sXB.js", "/assets/supabase.client-C2dMp-kt.js"], "css": ["/assets/root-DitPymht.css"] }, "routes/builder.$projectId": { "id": "routes/builder.$projectId", "parentId": "routes/builder", "path": ":projectId", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/builder._projectId-C-RMFZ1h.js", "imports": ["/assets/index-BHE-KyRT.js", "/assets/index-CjC8eJDC.js", "/assets/supabase.client-C2dMp-kt.js"], "css": ["/assets/index-BZP4dCNL.css"] }, "routes/preview.$projectId": { "id": "routes/preview.$projectId", "parentId": "routes/preview", "path": ":projectId", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/preview._projectId-BqXL8PTU.js", "imports": ["/assets/index-BHE-KyRT.js", "/assets/preview-DZhJoF5f.js", "/assets/components-DN1P8sXB.js"], "css": [] }, "routes/dashboard": { "id": "routes/dashboard", "parentId": "root", "path": "dashboard", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/dashboard-CMTep6Dv.js", "imports": ["/assets/index-BHE-KyRT.js", "/assets/supabase.client-C2dMp-kt.js"], "css": [] }, "routes/builder": { "id": "routes/builder", "parentId": "root", "path": "builder", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/builder-C-RMFZ1h.js", "imports": ["/assets/index-BHE-KyRT.js", "/assets/index-CjC8eJDC.js", "/assets/supabase.client-C2dMp-kt.js"], "css": ["/assets/index-BZP4dCNL.css"] }, "routes/preview": { "id": "routes/preview", "parentId": "root", "path": "preview", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/preview-BOo7rwIF.js", "imports": ["/assets/index-BHE-KyRT.js", "/assets/preview-DZhJoF5f.js"], "css": [] }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/_index-BJLfBCiH.js", "imports": ["/assets/index-BHE-KyRT.js"], "css": [] }, "routes/signin": { "id": "routes/signin", "parentId": "root", "path": "signin", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/signin-CxvTKHWE.js", "imports": ["/assets/index-BHE-KyRT.js", "/assets/supabase.client-C2dMp-kt.js"], "css": [] }, "routes/signup": { "id": "routes/signup", "parentId": "root", "path": "signup", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/signup-HPorINzD.js", "imports": ["/assets/index-BHE-KyRT.js", "/assets/supabase.client-C2dMp-kt.js"], "css": [] } }, "url": "/assets/manifest-11fd4b23.js", "version": "11fd4b23" };
const mode = "production";
const assetsBuildDirectory = "build/client";
const basename = "/";
const future = { "v3_fetcherPersist": true, "v3_relativeSplatPath": true, "v3_throwAbortReason": true, "v3_routeConfig": false, "v3_singleFetch": true, "v3_lazyRouteDiscovery": true, "unstable_optimizeDeps": false };
const isSpaMode = false;
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/builder.$projectId": {
    id: "routes/builder.$projectId",
    parentId: "routes/builder",
    path: ":projectId",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/preview.$projectId": {
    id: "routes/preview.$projectId",
    parentId: "routes/preview",
    path: ":projectId",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/dashboard": {
    id: "routes/dashboard",
    parentId: "root",
    path: "dashboard",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/builder": {
    id: "routes/builder",
    parentId: "root",
    path: "builder",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  },
  "routes/preview": {
    id: "routes/preview",
    parentId: "root",
    path: "preview",
    index: void 0,
    caseSensitive: void 0,
    module: route5
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route6
  },
  "routes/signin": {
    id: "routes/signin",
    parentId: "root",
    path: "signin",
    index: void 0,
    caseSensitive: void 0,
    module: route7
  },
  "routes/signup": {
    id: "routes/signup",
    parentId: "root",
    path: "signup",
    index: void 0,
    caseSensitive: void 0,
    module: route8
  }
};
export {
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  mode,
  publicPath,
  routes
};
