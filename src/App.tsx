import { useNavigate } from 'react-router';
import './App.css'

function App() {
  const navigate = useNavigate();

  return (
    <main className="grid justify-center items-center h-screen ">
      
      
      <div className="bg-white dark:bg-gray-800 rounded-lg px-6 py-8 ring shadow-xl ring-gray-900/5">
      <button onClick={() => navigate("/signin")} className='btn btn-primary'>sign in</button>
        <div>
          <span className="inline-flex items-center justify-center rounded-md bg-indigo-500 p-2 shadow-lg">
            <svg className="h-6 w-6 stroke-white">
            </svg>
          </span>
        </div>
        <h3 className="text-gray-900 dark:text-white mt-5 text-base font-medium tracking-tight ">Writes upside-down</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm ">
          The Zero Gravity Pen can be used to write in any orientation, including upside-down. It even works in outer space.
        </p>
      </div>
      <div className="col-start-2 row-start-2 size-32 bg-white ring-1 ring-sky-300 dark:bg-gray-900 dark:ring-sky-400"><div className="relative box-border size-32 p-5 ring ring-sky-300 ring-inset"><div className="relative z-1 h-full w-full bg-sky-500 ring-1 ring-sky-500"></div><div className="absolute inset-0"><div className="h-full text-black/10 dark:text-white/12.5 bg-[size:8px_8px] bg-left-top bg-[image:repeating-linear-gradient(315deg,currentColor_0,currentColor_1px,transparent_0,transparent_50%)]"></div></div></div></div>
    </main>
  )
}

export default App;
