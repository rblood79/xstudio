import { useNavigate } from "@remix-run/react"; // 추가: useNavigate import
import { supabase } from "../supabaseClient"; // 상대경로 확인

function Dashboard() {
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div>
      <div>
        <main>main</main>
        <aside>sidebar</aside>
        <nav>header</nav>
        <footer>footer</footer>
        <h1>dashboard Page</h1>
        <button onClick={handleLogout}>로그아웃</button>
      </div>
    </div>
  );
}

export default Dashboard;
