import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MovieCard from "./moviecard";
import SearchIcon from "./search.svg";
import Footer from "./Footer";
import "../App.css";

const API_KEY = "ce1a0db13c99a45fd7effb86ab82f78f";
const API_URL = "https://api.themoviedb.org/3";

const Home = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [movies, setMovies] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLatestMovies();
  }, []);

  const fetchLatestMovies = async () => {
    try {
      const response = await fetch(
        `${API_URL}/movie/now_playing?api_key=${API_KEY}&language=en-US&page=1`
      );
      const data = await response.json();
      setMovies(data.results || []);
    } catch (error) {
      console.error("Error fetching latest movies:", error);
    }
  };

  const fetchMovies = async (query) => {
    if (!query.trim()) {
      fetchLatestMovies();
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/search/multi?api_key=${API_KEY}&query=${query}&language=en-US`
      );
      const data = await response.json();
      setMovies(data.results || []);
    } catch (error) {
      console.error("Error fetching movies:", error);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    fetchMovies(value);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      fetchMovies(searchTerm);
    }
  };

  const handleClearAll = () => {
    setSearchTerm("");
    fetchLatestMovies();
  };

  return (
    <div className="app">
      <h1>Funbox</h1>

      <div className="search" style={{ position: "relative" }}>
        <input
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Search for movies or TV series"
        />

        <img
          src={SearchIcon}
          alt="search"
          onClick={() => fetchMovies(searchTerm)}
          style={{ cursor: "pointer", marginLeft: "8px" }}
        />

      
        {searchTerm && (
          <button
            onClick={handleClearAll}
            style={{
              position: "absolute",
              right: "60px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              color: "#fff",
              fontSize: "14px",
              cursor: "pointer",
              opacity: "0.8",
              fontSize: "20px"
            }}
          >
          X
          </button>
        )}
      </div>

      {movies?.length > 0 ? (
        <div className="container">
          {movies.map((movie) => (
            <div
              key={movie.id}
              onClick={() =>
                navigate(
                  `/${movie.media_type === "tv" ? "tv" : "movie"}/${movie.id}`
                )
              }
              style={{ cursor: "pointer" }}
            >
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <h2>No movies or series found</h2>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Home;
