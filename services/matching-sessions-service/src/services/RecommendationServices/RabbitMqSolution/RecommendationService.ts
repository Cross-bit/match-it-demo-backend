import * as DTO from "../../types"


import ActivityQueuesManager from "./ActivityQueuesManager"

export const moviesQueuesManager = new ActivityQueuesManager<DTO.MovieActivityItem>();