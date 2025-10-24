import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import "../App.css";
import Footer from "./Footer";

const API_KEY = "ce1a0db13c99a45fd7effb86ab82f78f";
const BASE_URL = "https://api.themoviedb.org/3";
const YOUTUBE_API_KEY = "AIzaSyDIJol94J-5LTuakQSNkOK3OcTrQRIDhzg";

const TvDetails = () => {
  const { id } = useParams();
    const navigate = useNavigate();
  const [tv, setTv] = useState(null);
  const [cast, setCast] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [trailerId, setTrailerId] = useState(null);

  useEffect(() => {
    fetchTvDetails();
    fetchTvCast();
    fetchRecommendations();
  }, [id]);

  useEffect(() => {
    if (tv) fetchTrailer();
  }, [tv]);

  const fetchTvDetails = async () => {
    const response = await fetch(
      `${BASE_URL}/tv/${id}?api_key=${API_KEY}&language=en-US`
    );
    const data = await response.json();
    setTv(data);
  };

  const fetchTvCast = async () => {
    const response = await fetch(
      `${BASE_URL}/tv/${id}/credits?api_key=${API_KEY}&language=en-US`
    );
    const data = await response.json();
    setCast(data.cast.slice(0, 10));
  };

  const fetchRecommendations = async () => {
    const response = await fetch(
      `${BASE_URL}/tv/${id}/recommendations?api_key=${API_KEY}&language=en-US`
    );
    const data = await response.json();
    setRecommendations(data.results.slice(0, 10));
  };

  const fetchTrailer = async () => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
          tv?.name || ""
        )}+official+trailer&type=video&key=${YOUTUBE_API_KEY}`
      );
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        setTrailerId(data.items[0].id.videoId);
      }
    } catch (error) {
      console.error("Error fetching trailer:", error);
    }
  };

  if (!tv) return <div className="loading">Loading...</div>;

  return (
    <div className="app">
      <h1>Funbox</h1>
       <div className="details-page">
             <div className="nav-buttons" style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                   <button onClick={() => navigate(-1)} className="back-button">← Back</button>
                   <Link to="/" className="back">🏠 Home</Link>
                 </div>

        <div
          className="banner"
          style={{
            backgroundImage: `url(https://image.tmdb.org/t/p/original${tv.backdrop_path})`,
          }}
        >
          <div className="overlay">
            <div className="poster">
              <img
                src={
                  tv.poster_path
                    ? `https://image.tmdb.org/t/p/w500${tv.poster_path}`
                    : "https://via.placeholder.com/300x450?text=No+Image"
                }
                alt={tv.name}
              />
            </div>
            <div className="info">
              <h1>{tv.name}</h1>
              <p>
                <strong>First Air Date:</strong> {tv.first_air_date}
              </p>
              <p>
                <strong>Rating:</strong> ⭐ {tv.vote_average?.toFixed(1)} / 10
              </p>
              <p>
                <strong>Seasons:</strong> {tv.number_of_seasons}
              </p>
              <p>
                <strong>Episodes:</strong> {tv.number_of_episodes}
              </p>
              <p>
                <strong>Language:</strong>{" "}
                {tv.original_language?.toUpperCase()}
              </p>
              <p>
                <strong>Genres:</strong>{" "}
                {tv.genres?.map((g) => g.name).join(", ")}
              </p>
              <p className="overview">{tv.overview}</p>
            </div>
          </div>
        </div>

    
        {trailerId && (
          <div className="trailer-section" style={{ margin: "40px 0" }}>
            <h2 style={{ color: "#f9d3b4", marginBottom: "20px" }}>
              Official Trailer
            </h2>
            <div className="trailer-container" style={{ textAlign: "center" }}>
              <iframe
                width="100%"
                height="480"
                src={`https://www.youtube.com/embed/${trailerId}`}
                title={`${tv.name} Trailer`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{
                  borderRadius: "10px",
                  maxWidth: "900px",
                }}
              ></iframe>
            </div>
          </div>
        )}

        <div className="cast-section">
          <h2>Top Cast</h2>
          <div className="cast-container">
            {cast.map((actor) => (
              <Link key={actor.id} to={`/actor/${actor.id}`} className="cast-card">
                <img
                  src={
                    actor.profile_path
                      ? `https://image.tmdb.org/t/p/w200${actor.profile_path}`
                      : "https://via.placeholder.com/150x225?text=No+Image"
                  }
                  alt={actor.name}
                />
                <p>{actor.name}</p>
                <small>{actor.character}</small>
              </Link>
            ))}
          </div>
        </div>

        <div className="related-section">
          <h2>Related TV Shows</h2>
          <div className="related-container">
            {recommendations.map((show) => (
              <Link key={show.id} to={`/tv/${show.id}`} className="related-card">
                <img
                  src={
                    show.poster_path
                      ? `https://image.tmdb.org/t/p/w300${show.poster_path}`
                      : "https://via.placeholder.com/200x300?text=No+Image"
                  }
                  alt={show.name}
                />
                <h3>{show.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TvDetails;
