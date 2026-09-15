import React,{createContext,useContext,useEffect,useRef,useState} from "react";
import { useAPI} from "./contexteAPI";
import { useAuth} from "./contexteAuth";
import AutoRefresh from "@/functions/autoRefresh";
import catcher from "@/functions/catcher";
import log from "@/functions/log";
import { convertirUTCversLocale } from "@/functions/convertirUTCenLocal";
import {Conversation,ConversationBrute,Message,MessageBrut} from "@/types/messaging"