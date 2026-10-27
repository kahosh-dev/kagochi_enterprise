import "./FarmBackground.css";

const farmScenes = [
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1920&q=85",
  "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=1920&q=85",
  "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=1920&q=85",
];

export default function FarmBackground() {
  return (
    <div className="farm-background" aria-hidden="true">
      {farmScenes.map((scene, index) => (
        <div
          className="farm-background__scene"
          key={scene}
          style={{
            backgroundImage: `url("${scene}")`,
            animationDelay: `${index * 8}s`,
          }}
        />
      ))}
      <div className="farm-background__overlay" />
      <div className="farm-background__glow farm-background__glow--one" />
      <div className="farm-background__glow farm-background__glow--two" />
      <div className="farm-background__horizon" />
    </div>
  );
}
