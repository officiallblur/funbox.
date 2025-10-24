import React from "react";

const MovieCard = ({ movie }) => {
  const imageUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : "https://via.placeholder.com/400";

  const type =
    movie.media_type === "tv" || movie.first_air_date ? "TV Show" : "Movie";

  
  const title = movie.title || movie.name || "Untitled";


  const year =
    movie.release_date?.slice(0, 4) || movie.first_air_date?.slice(0, 4) || "";

  return (
    <div className="movie">
      <div>
        <p>{year}</p>
      </div>

      <div>
        <img src={imageUrl} alt={title} />
      </div>

      <div>
        <span>{type}</span>
        <h3>{title}</h3>
      </div>
    </div>
  );
};

export default MovieCard;
