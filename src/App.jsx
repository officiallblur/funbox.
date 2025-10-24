import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import MovieDetails from "./components/MovieDetails";
import ActorDetails from "./components/ActorsDetails";
import TvDetails  from "./components/TvDetails";


const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movie/:id" element={<MovieDetails />} />
         <Route path="/actor/:id" element={<ActorDetails />} />
         <Route path="/tv/:id" element={<TvDetails />} />

      </Routes>
    </Router>
  );
};

export default App;
