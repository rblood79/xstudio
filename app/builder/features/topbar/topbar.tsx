import type { ReactNode } from "react";

export const Topbar = ({ children }: { children: ReactNode }) => {

    return (
        <div>
            <nav>
                <ul>
                    <li>title</li>
                    <li>size</li>
                    <li>publish</li>
                </ul>
            </nav>
            {children}
        </div>
    );
}