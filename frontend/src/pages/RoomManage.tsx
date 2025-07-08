// frontend/src/pages/RoomManage.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../services/api";
import { Program, Room, Occupant } from "../context/models";
import {
  ChevronLeft,
  Hotel,
  Plus,
  Save,
  Users,
  Trash2,
  Download,
} from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "../components/Modal";
import OccupantSearchBox from "../components/room/OccupantSearchBox";
import { useTranslation } from "react-i18next";

type MovePersonState = {
  occupant: Occupant;
  fromRoomName: string;
  fromRoomType: string;
} | null;

export default function RoomManage() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [hotels, setHotels] = useState<string[]>([]);
  const [currentHotelIndex, setCurrentHotelIndex] = useState(0);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [initialRoomsData, setInitialRoomsData] = useState<Room[]>([]);
  const [isNewRoomModalOpen, setIsNewRoomModalOpen] = useState(false);
  const [newRoomDetails, setNewRoomDetails] = useState({ name: "", type: "" });
  const [movePersonState, setMovePersonState] = useState<MovePersonState>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [editingRoom, setEditingRoom] = useState<{
    name: string;
    type: string;
  } | null>(null);
  const [tempRoomName, setTempRoomName] = useState("");

  const currentHotelName = hotels[currentHotelIndex];

  const { data: program, isLoading: isLoadingProgram } = useQuery<Program>({
    queryKey: ["program", programId],
    queryFn: () => api.getProgramById(programId!),
    enabled: !!programId,
  });

  const { data: initialRooms, isLoading: isLoadingRooms } = useQuery<Room[]>({
    queryKey: ["rooms", programId, currentHotelName],
    queryFn: () => api.getRooms(programId!, currentHotelName),
    enabled: !!programId && !!currentHotelName,
  });

  const { mutate: saveRooms, isPending: isSaving } = useMutation({
    mutationFn: (newRooms: Room[]) =>
      api.saveRooms(programId!, currentHotelName, newRooms),
    onSuccess: (data) => {
      toast.success(t("saveChanges"));
      queryClient.invalidateQueries({
        queryKey: ["rooms", programId, currentHotelName],
      });
      queryClient.invalidateQueries({
        queryKey: ["unassignedOccupantsSearch"],
      });
      setInitialRoomsData(JSON.parse(JSON.stringify(data)));
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save rooms.");
    },
  });

  const hasChanges = useMemo(() => {
    return JSON.stringify(rooms) !== JSON.stringify(initialRoomsData);
  }, [rooms, initialRoomsData]);

  const assignedIds = useMemo(() => {
    const ids = new Set<number>();
    if (rooms) {
      rooms.forEach((room) => {
        room.occupants.forEach((occ) => {
          if (occ) ids.add(occ.id);
        });
      });
    }
    return ids;
  }, [rooms]);

  const groupedRooms = useMemo(() => {
    if (!rooms) return {};
    return rooms.reduce((acc, room) => {
      if (!acc[room.type]) {
        acc[room.type] = [];
      }
      acc[room.type].push(room);
      return acc;
    }, {} as Record<string, Room[]>);
  }, [rooms]);

  const roomTypesForCurrentHotel = useMemo(() => {
    if (!program || !currentHotelName) return new Map<string, number>();
    const types = new Map<string, number>();
    program.packages.forEach((pkg) => {
      pkg.prices.forEach((price) => {
        if (price.hotelCombination.includes(currentHotelName)) {
          price.roomTypes.forEach((rt) => {
            if (!types.has(rt.type)) {
              types.set(rt.type, rt.guests);
            }
          });
        }
      });
    });
    return types;
  }, [program, currentHotelName]);

  useEffect(() => {
    if (program) {
      const hotelSet = new Set<string>();
      program.packages.forEach((pkg) => {
        Object.values(pkg.hotels).forEach((hotelList) => {
          hotelList.forEach((hotelName) => {
            if (hotelName) hotelSet.add(hotelName);
          });
        });
      });
      setHotels(Array.from(hotelSet));
    }
  }, [program]);

  useEffect(() => {
    if (initialRooms) {
      const sanitizedRooms = initialRooms.map((room) => ({
        ...room,
        occupants: Array.from(
          { length: room.capacity },
          (_, i) => room.occupants[i] || null
        ),
      }));
      setRooms(sanitizedRooms);
      setInitialRoomsData(JSON.parse(JSON.stringify(sanitizedRooms)));
    } else {
      setRooms([]);
      setInitialRoomsData([]);
    }
  }, [initialRooms]);

  const handleAssignOccupant = (
    roomName: string,
    roomType: string,
    slotIndex: number,
    occupant: Occupant
  ) => {
    setRooms((currentRooms) => {
      const newRooms = JSON.parse(JSON.stringify(currentRooms));
      const room = newRooms.find(
        (r: Room) => r.name === roomName && r.type === roomType
      );
      if (room) {
        room.occupants[slotIndex] = occupant;
      }
      return newRooms;
    });
  };

  const handleUnassignOccupant = (
    roomName: string,
    roomType: string,
    slotIndex: number
  ) => {
    setRooms((currentRooms) => {
      const newRooms = JSON.parse(JSON.stringify(currentRooms));
      const room = newRooms.find(
        (r: Room) => r.name === roomName && r.type === roomType
      );
      if (room) {
        room.occupants[slotIndex] = null;
      }
      return newRooms;
    });
  };

  const handleMoveOccupant = (
    occupant: Occupant,
    fromRoomName: string,
    fromRoomType: string
  ) => {
    setMovePersonState({ occupant, fromRoomName, fromRoomType });
  };

  const executeMove = (toRoomName: string, toRoomType: string) => {
    if (!movePersonState) return;
    const { occupant, fromRoomName, fromRoomType } = movePersonState;

    setRooms((currentRooms) => {
      const newRooms = JSON.parse(JSON.stringify(currentRooms));
      const fromRoom = newRooms.find(
        (r: Room) => r.name === fromRoomName && r.type === fromRoomType
      );
      const toRoom = newRooms.find(
        (r: Room) => r.name === toRoomName && r.type === toRoomType
      );

      if (fromRoom && toRoom) {
        const emptySlotIndex = toRoom.occupants.findIndex(
          (occ: Occupant | null) => occ === null
        );
        if (emptySlotIndex === -1) {
          toast.error(t("roomFull"));
          return currentRooms;
        }
        const occupantIndex = fromRoom.occupants.findIndex(
          (occ: Occupant | null) => occ && occ.id === occupant.id
        );
        if (occupantIndex > -1) {
          fromRoom.occupants[occupantIndex] = null;
          toRoom.occupants[emptySlotIndex] = occupant;
        }
      }
      return newRooms;
    });
    setMovePersonState(null);
  };

  const handleAddNewRoom = () => {
    if (!newRoomDetails.name.trim()) {
      toast.error(t("roomNameRequired"));
      return;
    }
    if (!newRoomDetails.type) {
      toast.error(t("roomTypeRequired"));
      return;
    }
    if (
      rooms.some(
        (r) =>
          r.name === newRoomDetails.name.trim() &&
          r.type === newRoomDetails.type
      )
    ) {
      toast.error(
        t("roomExistsError", {
          roomName: newRoomDetails.name,
          roomType: newRoomDetails.type,
        })
      );
      return;
    }
    const capacity = roomTypesForCurrentHotel.get(newRoomDetails.type) || 0;
    const newRoom: Room = {
      name: newRoomDetails.name.trim(),
      type: newRoomDetails.type,
      capacity: capacity,
      occupants: Array(capacity).fill(null),
    };
    setRooms([...rooms, newRoom]);
    setIsNewRoomModalOpen(false);
    setNewRoomDetails({ name: "", type: "" });
  };

  const handleDeleteRoom = (roomName: string, roomType: string) => {
    const roomToDelete = rooms.find(
      (r) => r.name === roomName && r.type === roomType
    );
    if (roomToDelete && roomToDelete.occupants.some((o) => o !== null)) {
      toast.error(t("deleteRoomError"));
      return;
    }
    setRooms(
      rooms.filter((r) => !(r.name === roomName && r.type === roomType))
    );
  };

  const handleRoomNameChange = (oldName: string, roomType: string) => {
    if (!tempRoomName.trim()) {
      toast.error(t("roomNameRequired"));
      setEditingRoom(null);
      return;
    }
    if (tempRoomName.trim() && tempRoomName.trim() !== oldName) {
      if (
        rooms.some((r) => r.name === tempRoomName.trim() && r.type === roomType)
      ) {
        toast.error(
          t("roomExistsError", {
            roomName: tempRoomName.trim(),
            roomType: roomType,
          })
        );
        setEditingRoom(null);
        return;
      }

      setRooms((currentRooms) =>
        currentRooms.map((r) =>
          r.name === oldName && r.type === roomType
            ? { ...r, name: tempRoomName.trim() }
            : r
        )
      );
    }
    setEditingRoom(null);
  };

  const handleExport = async () => {
    if (!programId) return;
    setIsExporting(true);
    toast.loading(t("exporting"));
    try {
      const blob = await api.exportRoomAssignmentsToExcel(programId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${program?.name}_Rooming_List.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success("Export successful!");
    } catch (error) {
      toast.dismiss();
      toast.error((error as Error).message || "Failed to export.");
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoadingProgram || isLoadingRooms) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/room-management")}
            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
          >
            <ChevronLeft />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {program?.name} - {t("roomManagementTitle")}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-xl disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Download
              className={`${
                document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
              }`}
            />{" "}
            {isExporting ? t("exporting") : t("exportToExcelRooming")}
          </button>
          <button
            onClick={() =>
              saveRooms(
                rooms.map((r) => ({
                  ...r,
                  occupants: r.occupants.filter((o) => o),
                }))
              )
            }
            disabled={isSaving || !hasChanges}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Save
              className={`${
                document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
              }`}
            />{" "}
            {isSaving ? t("saving") : t("saveChanges")}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
        {hotels.map((hotel, index) => (
          <button
            key={hotel}
            onClick={() => setCurrentHotelIndex(index)}
            className={`flex-grow px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              currentHotelIndex === index
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Hotel size={16} />
            {hotel}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from(roomTypesForCurrentHotel.keys()).map((type) => {
          const roomsInType = groupedRooms[type] || [];
          return (
            <div key={type} className="col-span-1 space-y-4">
              <h3 className="text-center font-bold text-xl">{type}</h3>
              {roomsInType.map((room) => (
                <div
                  key={`${room.name}-${room.type}`}
                  className="bg-white p-4 rounded-lg shadow-sm"
                >
                  <div className="flex justify-between items-center mb-2">
                    {editingRoom &&
                    editingRoom.name === room.name &&
                    editingRoom.type === room.type ? (
                      <input
                        type="text"
                        value={tempRoomName}
                        onChange={(e) => setTempRoomName(e.target.value)}
                        onBlur={() =>
                          handleRoomNameChange(room.name, room.type)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleRoomNameChange(room.name, room.type);
                          } else if (e.key === "Escape") {
                            setEditingRoom(null);
                          }
                        }}
                        className="font-semibold border-b-2 border-blue-500 focus:outline-none bg-transparent"
                        autoFocus
                      />
                    ) : (
                      <h4
                        className="font-semibold cursor-pointer hover:text-blue-600"
                        onClick={() => {
                          setEditingRoom({ name: room.name, type: room.type });
                          setTempRoomName(room.name);
                        }}
                      >
                        {room.name}
                      </h4>
                    )}
                    <div className="flex items-center">
                      <Users
                        size={16}
                        className={`${
                          document.documentElement.dir === "rtl"
                            ? "ml-1"
                            : "mr-1"
                        }`}
                      />
                      <span>
                        {room.occupants.filter((o) => o).length}/{room.capacity}
                      </span>
                      <button
                        onClick={() => handleDeleteRoom(room.name, room.type)}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: room.capacity }).map((_, i) => (
                      <OccupantSearchBox
                        key={i}
                        programId={programId!}
                        hotelName={currentHotelName}
                        assignedOccupant={room.occupants[i]}
                        assignedIds={assignedIds}
                        onAssign={(occ) =>
                          handleAssignOccupant(room.name, room.type, i, occ)
                        }
                        onUnassign={() =>
                          handleUnassignOccupant(room.name, room.type, i)
                        }
                        onMove={(occ) =>
                          handleMoveOccupant(occ, room.name, room.type)
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={() => {
                  setNewRoomDetails({
                    name: ``,
                    type: type,
                  });
                  setIsNewRoomModalOpen(true);
                }}
                className="w-full mt-2 p-2 bg-gray-200 rounded hover:bg-gray-300 flex items-center justify-center"
              >
                <Plus
                  size={16}
                  className={`${
                    document.documentElement.dir === "rtl" ? "ml-1" : "mr-1"
                  }`}
                />{" "}
                {t("addRoom")}
              </button>
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={!!movePersonState}
        onClose={() => setMovePersonState(null)}
        title={t("movePerson")}
      >
        {movePersonState && (
          <div className="space-y-4">
            <p>
              {t("movePersonTo", {
                personName: movePersonState.occupant.clientName,
              })}
            </p>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {rooms.map((room) => (
                <button
                  key={`${room.name}-${room.type}`}
                  onClick={() => executeMove(room.name, room.type)}
                  disabled={
                    room.occupants.filter((o) => o).length >= room.capacity
                  }
                  className={`w-full p-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 ${
                    document.documentElement.dir === "rtl"
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {room.name} ({room.type}) (
                  {room.occupants.filter((o) => o).length}/{room.capacity})
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isNewRoomModalOpen}
        onClose={() => setIsNewRoomModalOpen(false)}
        title={t("addNewRoom")}
      >
        <div className="space-y-4">
          <div>
            <label>{t("roomName")}</label>
            <input
              type="text"
              value={newRoomDetails.name}
              onChange={(e) =>
                setNewRoomDetails({ ...newRoomDetails, name: e.target.value })
              }
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsNewRoomModalOpen(false)}
              className="p-2 bg-gray-200 rounded"
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleAddNewRoom}
              className="p-2 bg-blue-600 text-white rounded"
            >
              {t("addRoom")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
