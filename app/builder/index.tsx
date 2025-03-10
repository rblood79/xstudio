import { useNavigate } from "@remix-run/react"; // 추가: useNavigate import
import { supabase } from "../supabaseClient"; // 상대경로 확인

function Builder() {
    
    return (
        <div>
            <div>
                <main>main</main>
                <aside>sidebar</aside>
                <aside>inspector</aside>
                <nav>header</nav>
                <footer>footer</footer>
            </div>
        </div>
    );
}

export default Builder;
