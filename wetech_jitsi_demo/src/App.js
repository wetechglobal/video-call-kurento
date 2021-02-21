import React, { useState } from "react";

import { Jutsu } from "react-jutsu";

const App = () => {
  const [room, setRoom] = useState("");
  const [name, setName] = useState("");
  const [call, setCall] = useState(false);

  const handleClick = event => {
    event.preventDefault();
    if (room && name) setCall(true);
  };

  return call ? (
    <Jutsu
      // containerStyles={{ width: "1200px", height: "800px" }}
      // jitsiContainerStyles={{ width: "100%", height: "150%" }}
      domain="meet.jit.si"
      roomName={room}
      onMeetingEnd={() => console.log("Meeting has ended")}
      loadingComponent={<p>loading ...</p>}
      errorComponent={<p>Oops, something went wrong</p>}
      displayName={name}
    />
  ) : (
    <form>
      <input
        id="room"
        type="text"
        placeholder="Room"
        value={room}
        onChange={e => setRoom(e.target.value)}
      />
      <input
        id="name"
        type="text"
        placeholder="Name"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <button onClick={handleClick} type="submit">
        Start / Join
      </button>
    </form>
  );
};

export default App;
