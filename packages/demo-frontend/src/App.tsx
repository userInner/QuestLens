import {BrowserRouter, Navigate, Route, Routes} from "react-router-dom";

import {Layout} from "./components/Layout.js";
import {Landing} from "./pages/Landing.js";
import {MyTasks} from "./pages/MyTasks.js";
import {RequesterNew} from "./pages/RequesterNew.js";
import {TaskDetail} from "./pages/TaskDetail.js";
import {WorkerBrowse} from "./pages/WorkerBrowse.js";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="worker" element={<WorkerBrowse />} />
          <Route path="worker/me" element={<MyTasks role="worker" />} />
          <Route path="worker/tasks/:taskId" element={<TaskDetail role="worker" />} />
          <Route path="requester" element={<RequesterNew />} />
          <Route path="requester/me" element={<MyTasks role="requester" />} />
          <Route path="requester/tasks/:taskId" element={<TaskDetail role="requester" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
