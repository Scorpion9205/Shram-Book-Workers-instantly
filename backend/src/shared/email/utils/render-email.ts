import React from "react";
import { render } from "@react-email/render";

export async function renderEmail(

  component: React.ReactElement

) {

  return await render(component);

}