/**/
import './index.css';
function Theme() {
    return (
        <div className="sidebar-content theme">
            <h3>Theme</h3>
            <div className="theme-container">
                <div className="theme-item">
                    <div className="theme-item-title">
                        <h4>Basic</h4>
                        <p>Core colors</p>
                        <span>Override or set key colors that will be used to generate a color palettes and schemes</span>
                        <ul>
                            <li>
                                <span>Primary</span>
                                <span>Act as custom source color</span>
                            </li>
                            <li>
                                <span>Secondary</span>
                            </li>
                            <li>
                                <span>Tertiary</span>
                            </li>
                            <li>
                                <span>Error</span>
                            </li>
                            <li>
                                <span>Neutral</span>
                                <span>Used for background and surfaces</span>
                            </li>
                            <li>
                                <span>Neutral Variant</span>
                                <span>Used for medium emphasis andvariants</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Theme;