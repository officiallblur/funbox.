import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Footer from "./Footer";

const API_KEY = "ce1a0db13c99a45fd7effb86ab82f78f";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

const ActorDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [actor, setActor] = useState(null);
  const [knownFor, setKnownFor] = useState([]);

  useEffect(() => {
    fetchActorDetails();
    fetchKnownFor();
  }, [id]);

  const fetchActorDetails = async () => {
    const res = await fetch(`${BASE_URL}/person/${id}?api_key=${API_KEY}&language=en-US`);
    const data = await res.json();
    setActor(data);
  };

  const fetchKnownFor = async () => {
    const res = await fetch(`${BASE_URL}/person/${id}/movie_credits?api_key=${API_KEY}&language=en-US`);
    const data = await res.json();
    setKnownFor(data.cast || []);
  };



  if (!actor) return <div className="loading">Loading...</div>;

  return (
    <div className="actor-page">
      <div className="nav-buttons" style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <button onClick={() => navigate(-1)} className="back-button">← Back</button>
        <Link to="/" className="back">🏠 Home</Link>
      </div>

      <div className="actor-header">
        <div className="actor-image">
          <img
            src={actor.profile_path ? `${IMG_URL}${actor.profile_path}` : "/placeholder.jpg"}
            alt={actor.name}
          />
        </div>
        <div className="actor-info">
          <h1>{actor.name}</h1>
          <p><strong>Born:</strong> {actor.birthday || "N/A"}</p>
          <p><strong>Place of Birth:</strong> {actor.place_of_birth || "N/A"}</p>
          <p><strong>Known For:</strong> {actor.known_for_department}</p>
          <p><strong>Popularity:</strong> ⭐ {actor.popularity.toFixed(1)}</p>
          {actor.deathday && <p><strong>Died:</strong> {actor.deathday}</p>}
          

          {actor.biography && (
            <div className="bio">
              <h3>Biography</h3>
              <p>{actor.biography}</p>
            </div>
          )}
        </div>
      </div>

      <div className="known-for-section">
        <h2>Known For</h2>
        <div className="known-for-container">
          {knownFor.length > 0 ? (
            knownFor.map((movie) => (
              <Link key={movie.id} to={`/movie/${movie.id}`} className="known-for-card">
                <img
                  src={movie.poster_path ? `${IMG_URL}${movie.poster_path}` : "/placeholder.jpg"}
                  alt={movie.title}
                />
                <h3>{movie.title}</h3>
                <small>{movie.character && `as ${movie.character}`}</small>
              </Link>
            ))
          ) : (
            <p>No movies found for this actor.</p>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ActorDetails;

 